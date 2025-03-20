import {
  createPublicClient,
  createWalletClient,
  decodeAbiParameters,
  encodeAbiParameters,
  http,
  erc20Abi,
  formatEther,
  zeroAddress,
  isAddress,
  isAddressEqual,
  Abi,
  Hex,
  formatUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  estimateContractGas,
  simulateContract,
  waitForTransactionReceipt,
  writeContract,
  readContract,
} from "viem/actions";
import { ReportV3, ReportV4, StreamReport } from "../types";
import { feeManagerAbi, verifierProxyAbi } from "../config/abi";
import { logger } from "./logger";
import { getAllChains } from "../config/chains";
import {
  getChainId,
  getContractAddress,
  getGasCap,
  setChainId,
} from "../store";
import { getVerifier } from "../config/verifiers";

const getAccount = () => {
  try {
    return privateKeyToAccount(process.env.PRIVATE_KEY as Hex);
  } catch (error) {
    logger.error("ERROR", { error });
    return;
  }
};
export const accountAddress = getAccount()?.address ?? zeroAddress;

export async function executeContract({
  report,
  abi,
  functionName,
  functionArgs,
}: {
  report: ReportV3;
  abi: Abi;
  functionName: string;
  functionArgs: string[];
}) {
  try {
    const chainId = await getChainId();
    if (!chainId) {
      logger.warn("⚠️ Chain is missing. Connect to a chain and try again");
      return;
    }
    const account = getAccount();
    if (!account) {
      logger.error("‼️ Account is missing");
      return;
    }

    if (!abi || abi.length === 0) {
      logger.warn("⚠️ No abi provided");
      return;
    }
    if (!functionName || functionName.length === 0) {
      logger.warn("⚠️ No functionName provided");
      return;
    }
    if (!functionArgs || functionArgs.length === 0) {
      logger.warn("⚠️ No args provided");
      return;
    }

    logger.info("📝 Prepared verification transaction", report);

    const args = functionArgs.map((arg) => report[arg as keyof ReportV3]);

    const address = await getContractAddress(report.feedId, chainId);
    if (!address || !isAddress(address)) {
      logger.warn("⚠️ Contract address is missing");
      return;
    }
    const clients = await getClients();
    if (!clients || !clients.publicClient || !clients.walletClient) {
      logger.warn("⚠️ Invalid clients", { clients });
      return;
    }
    const { publicClient, walletClient } = clients;
    const gas = await estimateContractGas(publicClient, {
      account,
      address,
      abi,
      functionName,
      args,
    });
    logger.info(
      `⛽️ Estimated gas: ${formatEther(gas)} ${
        publicClient.chain?.nativeCurrency.symbol
      }`,
      { gas }
    );
    const gasCap = await getGasCap();
    if (gasCap && gas > BigInt(gasCap)) {
      logger.info(
        `🛑 Gas is above the limit of ${formatEther(
          BigInt(gasCap)
        )} | Aborting`,
        { gas, gasCap }
      );
      return;
    }
    const { request } = await simulateContract(publicClient, {
      account,
      address,
      abi,
      functionName,
      args,
    });
    logger.info("ℹ️ Transaction simulated", request);

    const hash = await writeContract(walletClient, request);
    logger.info(`⌛️ Sending transaction ${hash} `, hash);
    const txReceipt = await waitForTransactionReceipt(publicClient, { hash });
    return txReceipt;
  } catch (error) {
    logger.error("ERROR", { error });
  }
}

async function getContractAddresses() {
  try {
    const clients = await getClients();
    if (!clients || !clients.publicClient) {
      logger.warn("⚠️ Invalid clients", { clients });
      return {
        verifierProxyAddress: zeroAddress,
        feeManagerAddress: zeroAddress,
        rewardManagerAddress: zeroAddress,
        feeTokenAddress: zeroAddress,
      };
    }
    const { publicClient } = clients;
    const chainId = await getChainId();
    if (!chainId) {
      logger.warn("⚠️ No chainId provided");
      return;
    }
    const verifierProxyAddress = await getVerifier(chainId);
    if (!verifierProxyAddress) {
      logger.warn("⚠️ No verifier address provided");
      return;
    }

    const feeManagerAddress = await readContract(publicClient, {
      address: verifierProxyAddress,
      abi: verifierProxyAbi,
      functionName: "s_feeManager",
    });

    const [rewardManagerAddress, feeTokenAddress] = await Promise.all([
      readContract(publicClient, {
        address: feeManagerAddress,
        abi: feeManagerAbi,
        functionName: "i_rewardManager",
      }),
      readContract(publicClient, {
        address: feeManagerAddress,
        abi: feeManagerAbi,
        functionName: "i_linkAddress",
      }),
    ]);

    return {
      verifierProxyAddress,
      feeManagerAddress,
      rewardManagerAddress,
      feeTokenAddress,
    };
  } catch (error) {
    logger.error("ERROR", { error });
    return {
      verifierProxyAddress: zeroAddress,
      feeManagerAddress: zeroAddress,
      rewardManagerAddress: zeroAddress,
      feeTokenAddress: zeroAddress,
    };
  }
}

export async function verifyReport(report: StreamReport) {
  try {
    const account = getAccount();
    if (!account) {
      logger.error("‼️ Account is missing");
      return;
    }
    const clients = await getClients();

    if (!clients || !clients.publicClient || !clients.walletClient) {
      logger.warn("⚠️ Invalid clients", { clients });
      return;
    }
    const { publicClient, walletClient } = clients;

    const [, reportData] = decodeAbiParameters(
      [
        { type: "bytes32[3]", name: "" },
        { type: "bytes", name: "reportData" },
      ],
      report.rawReport
    );

    const reportVersion = reportData.charAt(5);
    if (reportVersion !== "3" && reportVersion !== "4") {
      logger.warn("⚠️ Invalid report version", { report });
      return;
    }

    const contractAddresses = await getContractAddresses();

    //     {
    //   verifierProxyAddress: '0x2482A390bE58b3cBB6Df72dB2e950Db20256e55E',
    //   feeManagerAddress: '0x770718b99955BB9fE9eb896523866a1f2E47F58e',
    //   rewardManagerAddress: '0xEf70db528C6Da9eeadb1FD182E1c682745ef190c',
    //   feeTokenAddress: '0xC82Ea35634BcE95C394B6BC00626f827bB0F4801'
    // }

    if (
      !contractAddresses ||
      Object.values(contractAddresses)
        .map((address) => isAddressValid(address))
        .includes(false)
    ) {
      logger.warn("⚠️ Invalid contract addresses", { contractAddresses });
      return;
    }

    const {
      feeManagerAddress,
      rewardManagerAddress,
      feeTokenAddress,
      verifierProxyAddress,
    } = contractAddresses;

    const [fee] = await readContract(publicClient, {
      address: feeManagerAddress,
      abi: feeManagerAbi,
      functionName: "getFeeAndReward",
      args: [account.address, reportData, feeTokenAddress],
    });
    logger.info(`⛽️ Estimated fee: ${formatEther(fee.amount)} LINK`, { fee });

    const feeTokenAddressEncoded = encodeAbiParameters(
      [{ type: "address", name: "parameterPayload" }],
      [feeTokenAddress]
    );

    const approveLinkGas = await estimateContractGas(publicClient, {
      account,
      address: feeTokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [rewardManagerAddress, fee.amount],
    });

    logger.info(
      `⛽️ Estimated gas for LINK approval: ${formatEther(approveLinkGas)} ${
        publicClient.chain?.nativeCurrency.symbol
      }`,
      { approveLinkGas }
    );
    const gasCap = "150000";

    // if (gasCap && approveLinkGas > BigInt(gasCap)) {
    //   logger.info(
    //     `🛑 LINK approval gas is above the limit of ${formatEther(
    //       BigInt(gasCap)
    //     )} | Aborting`,
    //     { approveLinkGas, gasCap }
    //   );
    //   return;
    // }

    // const { request: approveLinkRequest } = await simulateContract(
    //   publicClient,
    //   {
    //     account,
    //     address: feeTokenAddress,
    //     abi: erc20Abi,
    //     functionName: "approve",
    //     args: [rewardManagerAddress, fee.amount],
    //   }
    // );

    console.log("try and approve link");

    try {
      const approveLinkHash = await writeContract(walletClient, {
        account,
        address: feeTokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [rewardManagerAddress, fee.amount],
      });

      await waitForTransactionReceipt(publicClient, {
        hash: approveLinkHash,
      });
      console.log("approveLinkHash");
      console.log(approveLinkHash);

      await sleep(10000);
    } catch (e) {
      console.log("FAILED TO WRITE APPROVAL TX");
      console.log(e);
    }

    console.log("APPROVED LINK TO REWARD MANAGER ADDRESS");

    // const verifyReportGas = await estimateContractGas(publicClient, {
    //   account,
    //   address: verifierProxyAddress,
    //   abi: verifierProxyAbi,
    //   functionName: "verify",
    //   args: [report.rawReport, feeTokenAddressEncoded],
    // });
    // logger.info(
    //   `⛽️ Estimated gas for verification: ${formatEther(verifyReportGas)} ${
    //     publicClient.chain?.nativeCurrency.symbol
    //   }`,
    //   { verifyReportGas }
    // );
    // if (gasCap && verifyReportGas > BigInt(gasCap)) {
    //   logger.info(
    //     `🛑 Verification gas is above the limit of ${formatEther(
    //       BigInt(gasCap)
    //     )} | Aborting`,
    //     { verifyReportGas, gasCap }
    //   );
    //   return;
    // }

    const { request: verifyReportRequest, result: verifiedReportData } =
      await simulateContract(publicClient, {
        account,
        address: verifierProxyAddress,
        abi: verifierProxyAbi,
        functionName: "verify",
        args: [report.rawReport, feeTokenAddressEncoded],
      });

    const verifyReportHash = await writeContract(
      walletClient,
      verifyReportRequest
    );

    await waitForTransactionReceipt(publicClient, { hash: verifyReportHash });

    console.log("SUCCESSFULLY SENT VERIFY TX", verifyReportHash);

    console.log("VERIFIED REPORT DATA", verifiedReportData);

    if (reportVersion === "3") {
      const [
        feedId,
        validFromTimestamp,
        observationsTimestamp,
        nativeFee,
        linkFee,
        expiresAt,
        price,
        bid,
        ask,
      ] = decodeAbiParameters(
        [
          { type: "bytes32", name: "feedId" },
          { type: "uint32", name: "validFromTimestamp" },
          { type: "uint32", name: "observationsTimestamp" },
          { type: "uint192", name: "nativeFee" },
          { type: "uint192", name: "linkFee" },
          { type: "uint32", name: "expiresAt" },
          { type: "int192", name: "price" },
          { type: "int192", name: "bid" },
          { type: "int192", name: "ask" },
        ],
        verifiedReportData
      );
      const verifiedReport: ReportV3 = {
        feedId,
        validFromTimestamp,
        observationsTimestamp,
        nativeFee,
        linkFee,
        expiresAt,
        price,
        bid,
        ask,
      };
      return verifiedReport;
    }
    if (reportVersion === "4") {
      const [
        feedId,
        validFromTimestamp,
        observationsTimestamp,
        nativeFee,
        linkFee,
        expiresAt,
        price,
        marketStatus,
      ] = decodeAbiParameters(
        [
          { type: "bytes32", name: "feedId" },
          { type: "uint32", name: "validFromTimestamp" },
          { type: "uint32", name: "observationsTimestamp" },
          { type: "uint192", name: "nativeFee" },
          { type: "uint192", name: "linkFee" },
          { type: "uint32", name: "expiresAt" },
          { type: "int192", name: "price" },
          { type: "uint32", name: "marketStatus" },
        ],
        verifiedReportData
      );
      const verifiedReport: ReportV4 = {
        feedId,
        validFromTimestamp,
        observationsTimestamp,
        nativeFee,
        linkFee,
        expiresAt,
        price,
        marketStatus,
      };
      return verifiedReport;
    }
  } catch (error) {
    logger.error("ERROR", { error });
  }
}

const isAddressValid = (address: string) =>
  !isAddress(address) || isAddressEqual(address, zeroAddress) ? false : true;

async function getClients() {
  const chainId = await getChainId();

  if (!chainId) {
    logger.warn("⚠️ No chainId provided");
    return;
  }
  const chains = await getAllChains();
  const chain = chains.find((chain) => chain.id === Number(chainId));
  if (!chain) {
    logger.warn("⚠️ Invalid chain", { chainId });
    setChainId("");
  }
  const publicClient = createPublicClient({
    chain,
    transport: http(process.env.RPC_URL),
  });

  const account = getAccount();
  if (!account) {
    logger.error("‼️ Account is missing");
    return;
  }

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(process.env.RPC_URL),
  });

  return { publicClient, walletClient };
}

export async function getBalance() {
  try {
    const clients = await getClients();
    if (!clients || !clients.publicClient) {
      logger.warn("⚠️ Invalid clients", { clients });
      return;
    }
    const { publicClient } = clients;
    const balance = await publicClient.getBalance({ address: accountAddress });
    return {
      value: formatEther(balance),
      symbol: publicClient.chain?.nativeCurrency.symbol,
    };
  } catch (error) {
    logger.error("ERROR", { error });
    return {
      value: formatEther(0n),
      symbol: "",
    };
  }
}

export async function getLinkBalance() {
  try {
    const clients = await getClients();
    if (!clients || !clients.publicClient) {
      logger.warn("⚠️ Invalid clients", { clients });
      return;
    }
    const { publicClient } = clients;
    const contractAddresses = await getContractAddresses();

    if (
      !contractAddresses ||
      !isAddressValid(contractAddresses.feeTokenAddress)
    ) {
      logger.warn("⚠️ Invalid fee token addresses", { contractAddresses });
      return;
    }
    const { feeTokenAddress } = contractAddresses;
    const [balance, decimals, symbol] = await Promise.all([
      publicClient.readContract({
        address: feeTokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [accountAddress],
      }),
      publicClient.readContract({
        address: feeTokenAddress,
        abi: erc20Abi,
        functionName: "decimals",
      }),
      publicClient.readContract({
        address: feeTokenAddress,
        abi: erc20Abi,
        functionName: "symbol",
      }),
    ]);
    return {
      value: formatUnits(balance, decimals),
      symbol,
    };
  } catch (error) {
    logger.error("ERROR", { error });
    return {
      value: formatEther(0n),
      symbol: "",
    };
  }
}

export async function getCurrentChain() {
  const clients = await getClients();
  if (!clients || !clients.publicClient) {
    logger.warn("⚠️ Invalid clients", { clients });
    return;
  }
  const { publicClient } = clients;
  return { chainId: publicClient.chain?.id, name: publicClient.chain?.name };
}

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
