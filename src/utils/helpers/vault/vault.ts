import { Address } from '@graphprotocol/graph-ts';

import { BeefyVaultV2 } from '../../../../generated/BIFI Maxi/BeefyVaultV2';
import { Strategy as StrategyContract } from '../../../../generated/BIFI Maxi/Strategy';
import {
  Deposit,
  Harvest,
  Strategy,
  Transaction,
  Transfer,
  Vault,
  Withdrawal,
} from '../../../../generated/schema';
import { Strategy as StrategyABI } from '../../../../generated/templates';
import { BIGDECIMAL_ZERO, BIGINT_ZERO } from '../../constants';
import { toDecimal } from '../../decimals';
import { getOrCreateToken } from './token';

export function getOrCreateVaultTransfer(
  id: String,
  createIfNotFound: boolean = true,
): Transfer {
  // @ts-ignore: assign wrapper object to primitive
  let action = Transfer.load(id);

  if (action == null && createIfNotFound) {
    // @ts-ignore: assign wrapper object to primitive
    action = new Transfer(id);
  }

  return action as Transfer;
}

export function getOrCreateVaultDeposit(
  id: String,
  createIfNotFound: boolean = true,
): Deposit {
  // @ts-ignore: assign wrapper object to primitive
  let action = Deposit.load(id);

  if (action == null && createIfNotFound) {
    // @ts-ignore: assign wrapper object to primitive
    action = new Deposit(id);
  }

  return action as Deposit;
}

export function getOrCreateVaultWithdrawal(
  id: String,
  createIfNotFound: boolean = true,
): Withdrawal {
  // @ts-ignore: assign wrapper object to primitive
  let action = Withdrawal.load(id);

  if (action == null && createIfNotFound) {
    // @ts-ignore: assign wrapper object to primitive
    action = new Withdrawal(id);
  }

  return action as Withdrawal;
}

export function getOrCreateHarvest(
  id: String,
  createIfNotFound: boolean = true,
): Harvest {
  // @ts-ignore: assign wrapper object to primitive
  let action = Harvest.load(id);

  if (action == null && createIfNotFound) {
    // @ts-ignore: assign wrapper object to primitive
    action = new Harvest(id);
  }

  return action as Harvest;
}

export function getOrCreateStrategy(
  address: Address,
  createIfNotFound: boolean = true,
): Strategy {
  let id = address.toHexString();
  let strategy = Strategy.load(id);

  if (strategy == null && createIfNotFound) {
    strategy = new Strategy(id);

    strategy.totalEarnings = BIGDECIMAL_ZERO;
    strategy.totalEarningsRaw = BIGINT_ZERO;

    // dynamically index strategies
    StrategyABI.create(address);
  }

  return strategy as Strategy;
}

export function getOrCreateTransaction(
  id: String,
  createIfNotFound: boolean = true,
): Transaction {
  // @ts-ignore: assign wrapper object to primitive
  let transaction = Transaction.load(id);

  if (transaction == null && createIfNotFound) {
    // @ts-ignore: assign wrapper object to primitive
    transaction = new Transaction(id);
  }

  return transaction as Transaction;
}

export function getOrCreateVault(vaultAddress: Address, update: boolean = true): Vault {
  let vault = Vault.load(vaultAddress.toHexString());
  let vaultContract = BeefyVaultV2.bind(vaultAddress);

  if (vault == null) {
    vault = new Vault(vaultAddress.toHexString());

    // Initialize parsed values as BigDecimal 0
    vault.pricePerFullShare = BIGDECIMAL_ZERO;
    vault.netDeposits = BIGDECIMAL_ZERO;
    vault.totalDeposited = BIGDECIMAL_ZERO;
    vault.totalWithdrawn = BIGDECIMAL_ZERO;
    vault.totalActiveShares = BIGDECIMAL_ZERO;
    vault.totalSharesMinted = BIGDECIMAL_ZERO;
    vault.totalSharesBurned = BIGDECIMAL_ZERO;
    vault.vaultBalance = BIGDECIMAL_ZERO;
    vault.strategyBalance = BIGDECIMAL_ZERO;
    vault.totalSupply = BIGDECIMAL_ZERO;
    vault.available = BIGDECIMAL_ZERO;
    vault.totalEarnings = BIGDECIMAL_ZERO;

    // Initialize raw values as BigInt 0
    vault.pricePerFullShareRaw = BIGINT_ZERO;
    vault.netDepositsRaw = BIGINT_ZERO;
    vault.totalDepositedRaw = BIGINT_ZERO;
    vault.totalWithdrawnRaw = BIGINT_ZERO;
    vault.totalActiveSharesRaw = BIGINT_ZERO;
    vault.totalSharesMintedRaw = BIGINT_ZERO;
    vault.totalSharesBurnedRaw = BIGINT_ZERO;
    vault.vaultBalanceRaw = BIGINT_ZERO;
    vault.strategyBalanceRaw = BIGINT_ZERO;
    vault.totalSupplyRaw = BIGINT_ZERO;
    vault.availableRaw = BIGINT_ZERO;
    vault.totalEarningsRaw = BIGINT_ZERO;
    vault.totalHarvestCalls = BIGINT_ZERO;
  }

  if (update) {
    // Might be worth using the "try_" version of these calls in the future.
    let underlyingTokenAddress = vaultContract.token();
    let underlyingToken = getOrCreateToken(underlyingTokenAddress);
    // The vault itself is an ERC20
    let shareToken = getOrCreateToken(vaultAddress);

    let balance = vaultContract.try_balance();
    let pricePerFullShare = vaultContract.try_getPricePerFullShare();
    let totalSupply = vaultContract.try_totalSupply();
    let available = vaultContract.try_available();

    vault.vaultBalanceRaw = !balance.reverted ? balance.value : vault.vaultBalanceRaw;
    vault.pricePerFullShareRaw = !pricePerFullShare.reverted
      ? pricePerFullShare.value
      : vault.pricePerFullShareRaw;
    vault.totalSupplyRaw = !totalSupply.reverted
      ? totalSupply.value
      : vault.totalSupplyRaw;
    vault.availableRaw = !available.reverted ? available.value : vault.availableRaw;
    vault.underlyingToken = underlyingToken.id;
    vault.shareToken = shareToken.id;

    let strategyAddress = vaultContract.strategy();
    let strategy = getOrCreateStrategy(strategyAddress);
    strategy.vault = vault.id;
    strategy.save();

    let strategyContract = StrategyContract.bind(strategyAddress as Address);
    let strategyBalance = strategyContract.try_balanceOf();

    vault.currentStrategy = strategy.id;
    vault.strategyBalanceRaw = !strategyBalance.reverted
      ? strategyBalance.value
      : vault.strategyBalanceRaw;

    vault.strategyBalance = toDecimal(vault.strategyBalanceRaw, underlyingToken.decimals);
    vault.vaultBalance = toDecimal(vault.vaultBalanceRaw, underlyingToken.decimals);
    vault.totalSupply = toDecimal(vault.totalSupplyRaw, underlyingToken.decimals);
    // Uses the default decimals since it's a floating point representation
    vault.pricePerFullShare = toDecimal(vault.pricePerFullShareRaw);
    vault.available = toDecimal(vault.availableRaw, underlyingToken.decimals);
  }

  return vault as Vault;
}