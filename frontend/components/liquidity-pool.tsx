'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import BLXLiquidityPoolABI from '@/ABI/BLXLiquidityPool.json';
import BLXTokenABI from '@/ABI/BLXToken.json';
import { useAccount, useWalletClient } from 'wagmi';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpDown, Plus } from 'lucide-react';

const LIQUIDITY_POOL_ADDRESS = process.env.NEXT_PUBLIC_BLX_LIQUIDITY_POOL;
const BLX_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_BLX_TOKEN;

const SWAP_FEE_RATE = 0.003; // 0.3%
const BLX_DECIMALS = 18;

export function LiquidityPool() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  const [ethAmount, setEthAmount] = useState('');
  const [blxAmount, setBlxAmount] = useState('');
  const [ethBalance, setEthBalance] = useState<string>(''); // ETH balance as string
  const [blxBalance, setBlxBalance] = useState<string>(''); // BLX balance as string
  const [poolShare, setPoolShare] = useState<number | null>(null);
  const [poolRatio, setPoolRatio] = useState<string>(''); // Pool ratio as string
  const [exchangeRate, setExchangeRate] = useState(null);

  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');

  const [swapFromAmount, setSwapFromAmount] = useState('');
  const [swapToAmount, setSwapToAmount] = useState('');
  const [swapDirection, setSwapDirection] = useState<
    'eth-to-blx' | 'blx-to-eth'
  >('blx-to-eth');

  useEffect(() => {
    async function getSigner() {
      if (walletClient && address) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner(address);
        setSigner(signer);
      }
    }
    getSigner();
  }, [walletClient, address]);

  useEffect(() => {
    if (!isConnected || !address || !signer) return;

    async function fetchData() {
      try {
        // ETH balance
        const provider = new ethers.BrowserProvider(window.ethereum);
        const ethBal = await provider.getBalance(address);
        setEthBalance(ethers.formatEther(ethBal));

        // BLX balance
        const blxToken = new ethers.Contract(
          BLX_TOKEN_ADDRESS,
          BLXTokenABI.abi,
          signer
        );
        const blxBal = await blxToken.balanceOf(address);
        setBlxBalance(ethers.formatUnits(blxBal, 18));

        console.log('BLXLiquidityPoolABI.abi:', BLXLiquidityPoolABI.abi);

        // Pool info
        const pool = new ethers.Contract(
          LIQUIDITY_POOL_ADDRESS,
          BLXLiquidityPoolABI.abi,
          signer
        );
        const [blxReserve, pairedReserve] = await pool.getReserves();
        const ethReserve = pairedReserve;

        console.log('blxReserve', blxReserve.toString());
        console.log('ethReserve', ethReserve.toString());

        const ethRes = Number(ethers.formatEther(ethReserve));
        const blxRes = Number(ethers.formatUnits(blxReserve, 18));

        if (ethRes === 0 || blxRes === 0) {
          setPoolRatio(null); // or set to '' or '--' depending on your UI
          setExchangeRate(null); // No valid exchange rate
        } else {
          const ratio = blxRes / ethRes;
          setPoolRatio(ratio.toFixed(2));
          setExchangeRate(ratio); // Set exchange rate for swap calculations
        }

        const totalSupply = await pool.totalSupply();
        const userLP = await pool.balanceOf(address);
        const share =
          totalSupply > 0 ? (Number(userLP) / Number(totalSupply)) * 100 : 0;
        setPoolShare(share);
      } catch (error) {
        console.error('Error fetching data:', error);
        // Optionally reset states or show error UI
        setPoolRatio(null);
        setPoolShare(null);
        setEthBalance(null);
        setBlxBalance(null);
        setExchangeRate(null);
      }
    }

    fetchData();
  }, [isConnected, address, signer, txHash]);

  // Calculate output amount based on constant product formula and fee
  useEffect(() => {
    if (!swapFromAmount || !exchangeRate) {
      setSwapToAmount('');
      return;
    }

    const inputAmountNum = Number(swapFromAmount);
    if (inputAmountNum <= 0) {
      setSwapToAmount('');
      return;
    }

    // Simplified calculation ignoring reserves, just use exchange rate and fee
    // For more accurate swap, fetch reserves and apply constant product formula
    let outputAmount;
    if (swapDirection === 'eth-to-blx') {
      outputAmount = inputAmountNum * exchangeRate * (1 - SWAP_FEE_RATE);
    } else {
      outputAmount = (inputAmountNum / exchangeRate) * (1 - SWAP_FEE_RATE);
    }

    setSwapToAmount(outputAmount.toFixed(6));
  }, [swapFromAmount, swapDirection, exchangeRate]);

  const handleSwapDirectionToggle = () => {
    setSwapDirection(
      swapDirection === 'eth-to-blx' ? 'blx-to-eth' : 'eth-to-blx'
    );
    setSwapFromAmount(swapToAmount);
    setSwapToAmount(swapFromAmount);
  };

  // --- Add Liquidity Handler ---
  async function handleAddLiquidity() {
    if (!signer || !isConnected) {
      alert('Please connect your wallet!');
      return;
    }
    if (!ethAmount || !blxAmount) {
      alert('Enter both ETH and BLX amounts.');
      return;
    }

    if (Number(ethAmount) <= 0 || Number(blxAmount) <= 0) {
      alert('Amounts must be greater than zero');
      return;
    }
    if (Number(ethAmount) > Number(ethBalance)) {
      alert('Insufficient ETH balance');
      return;
    }
    if (Number(blxAmount) > Number(blxBalance)) {
      alert('Insufficient BLX balance');
      return;
    }

    setLoading(true);
    setTxHash('');

    try {
      console.log('Parsing amounts...');
      const blxToSend = ethers.parseUnits(blxAmount, 18);
      const ethToSend = ethers.parseEther(ethAmount);

      console.log('BLX to send (bigint):', blxToSend.toString());
      console.log('ETH to send (bigint):', ethToSend.toString());

      const blxToken = new ethers.Contract(
        BLX_TOKEN_ADDRESS,
        BLXTokenABI.abi,
        signer
      );

      console.log('Checking allowance...');
      const allowance = await blxToken.allowance(
        address,
        LIQUIDITY_POOL_ADDRESS
      );
      console.log('Current allowance:', allowance.toString());

      if (allowance < blxToSend) {
        console.log('Approving tokens...');
        const approveTx = await blxToken.approve(
          LIQUIDITY_POOL_ADDRESS,
          blxToSend
        );
        console.log('Approve tx hash:', approveTx.hash);
        await approveTx.wait();
        console.log('Approval confirmed');
      } else {
        console.log('Sufficient allowance, skipping approval');
      }

      const pool = new ethers.Contract(
        LIQUIDITY_POOL_ADDRESS,
        BLXLiquidityPoolABI.abi,
        signer
      );

      console.log('Calling addLiquidity with params:', {
        blxToSend: blxToSend,
        ethToSend: ethToSend,
      });

      if (typeof blxToSend !== 'bigint' || typeof ethToSend !== 'bigint') {
        throw new Error('Invalid BigNumberish values');
      }

      const tx = await pool.addLiquidity(blxToSend, { value: ethToSend });
      console.log('Transaction sent, hash:', tx.hash);

      await tx.wait();
      console.log('Transaction confirmed');

      setTxHash(tx.hash);
      alert('Liquidity added!');
      setEthAmount('');
      setBlxAmount('');
    } catch (err) {
      console.error('Error in handleAddLiquidity:', err);
      alert('Error: ' + (err?.reason || err?.message || 'unknown'));
    }

    setLoading(false);
  }

  // ------swap ----------
  function calculateOutputAmount(
    inputAmount,
    reserveIn,
    reserveOut,
    feeRate,
    feeDenominator
  ) {
    const feeAmount = (inputAmount * feeRate) / feeDenominator;
    const inputAmountAfterFee = inputAmount - feeAmount;
    const numerator = inputAmountAfterFee * reserveOut;
    const denominator = reserveIn + inputAmountAfterFee;
    return Math.floor(numerator / denominator);
  }

  function applySlippageTolerance(expectedOutput, slippagePercent) {
    return expectedOutput * (1 - slippagePercent / 100);
  }

  async function handleSwap() {
    if (!signer || !address) {
      alert('Please connect your wallet');
      return;
    }

    const inputAmount = swapFromAmount.trim();
    const expectedOutputAmount = swapToAmount.trim();

    if (!inputAmount || Number(inputAmount) <= 0) {
      alert('Enter a valid amount to swap');
      return;
    }

    if (!expectedOutputAmount || Number(expectedOutputAmount) <= 0) {
      alert('Output amount is zero or invalid');
      return;
    }

    const slippageTolerance = 5n; // 5% slippage tolerance as bigint

    setLoading(true);
    console.log('gg1');
    try {
      const pool = new ethers.Contract(
        LIQUIDITY_POOL_ADDRESS,
        BLXLiquidityPoolABI.abi,
        signer
      );
      const blxToken = new ethers.Contract(
        BLX_TOKEN_ADDRESS,
        BLXTokenABI.abi,
        signer
      );
      console.log('gg2');

      if (swapDirection === 'blx-to-eth') {
        const ethAmount = ethers.parseEther(inputAmount); // bigint
        const expectedBlxOut = ethers.parseUnits(
          expectedOutputAmount,
          BLX_DECIMALS
        ); // bigint

        console.log('gg3');
        console.log('expectedBlxOut', expectedBlxOut);
        console.log('slippageTolerance', slippageTolerance);
        const minBlxOut = (expectedBlxOut * (100n - slippageTolerance)) / 100n;
        console.log('minBlxOut', minBlxOut);
        console.log('gg4');

        // Simulate the swap call to check for errors and get output amount
        try {
          const simulatedOutput = await pool.swap.estimateGas(
            ethers.ZeroAddress,
            ethAmount,
            minBlxOut,
            { value: ethAmount }
          );
          console.log('gg4');
          console.log('Simulated output amount:', simulatedOutput.toString());
        } catch (simulationError) {
          console.error('Swap simulation failed:', simulationError);
          alert(
            'Swap simulation failed: ' +
              (simulationError?.reason ||
                simulationError?.message ||
                'Unknown error')
          );
          setLoading(false);
          return;
        }

        // Proceed with actual swap transaction
        const tx = await pool.swap(ethers.ZeroAddress, ethAmount, minBlxOut, {
          value: ethAmount,
        });
        await tx.wait();
      } else {
        const blxAmount = ethers.parseUnits(inputAmount, BLX_DECIMALS); // bigint
        const expectedEthOut = ethers.parseEther(expectedOutputAmount); // bigint

        const minEthOut = (expectedEthOut * (100n - slippageTolerance)) / 100n;

        // Approve BLX transfer first if needed
        const allowance = await blxToken.allowance(
          address,
          LIQUIDITY_POOL_ADDRESS
        );
        if (allowance < blxAmount) {
          const approveTx = await blxToken.approve(
            LIQUIDITY_POOL_ADDRESS,
            blxAmount
          );
          await approveTx.wait();
        }

        // Simulate the swap call
        try {
          const simulatedOutput = await pool.swap.estimateGas(
            BLX_TOKEN_ADDRESS,
            blxAmount,
            minEthOut
          );
          console.log('Simulated output amount:', simulatedOutput.toString());
        } catch (simulationError) {
          console.error('Swap simulation failed:', simulationError);
          alert(
            'Swap simulation failed: ' +
              (simulationError?.reason ||
                simulationError?.message ||
                'Unknown error')
          );
          setLoading(false);
          return;
        }

        // Proceed with actual swap transaction
        const tx = await pool.swap(BLX_TOKEN_ADDRESS, blxAmount, minEthOut);
        await tx.wait();
      }

      alert('Swap successful!');
      setSwapFromAmount('');
      setSwapToAmount('');
    } catch (err) {
      console.error('Swap error:', err);
      alert('Swap failed: ' + (err?.reason || err?.message || 'Unknown error'));
    }

    setLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Liquidity Pool</h1>
        <p className="text-gray-400">
          Add liquidity or swap tokens in the ETH/BLX pool
        </p>
        {isConnected && (
          <p className="text-sm text-gray-400">Connected: {address}</p>
        )}
      </div>

      <Tabs defaultValue="add-liquidity" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800">
          <TabsTrigger
            value="add-liquidity"
            className="data-[state=active]:bg-blue-600"
          >
            Add Liquidity
          </TabsTrigger>
          <TabsTrigger value="swap" className="data-[state=active]:bg-blue-600">
            Swap Tokens
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add-liquidity" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">
                Add Liquidity to ETH/BLX Pool
              </CardTitle>
              <CardDescription className="text-gray-400">
                Add both ETH and BLX tokens to earn trading fees
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="eth-amount" className="text-white">
                    ETH Amount
                  </Label>
                  <Input
                    id="eth-amount"
                    type="number"
                    placeholder="0.0"
                    value={ethAmount}
                    onChange={(e) => setEthAmount(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <p className="text-sm text-gray-400">
                    Balance: {ethBalance ? Number(ethBalance).toFixed(4) : '--'}{' '}
                    ETH
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blx-amount" className="text-white">
                    BLX Amount
                  </Label>
                  <Input
                    id="blx-amount"
                    type="number"
                    placeholder="0.0"
                    value={blxAmount}
                    onChange={(e) => setBlxAmount(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <p className="text-sm text-gray-400">
                    Balance: Balance:{' '}
                    {blxBalance ? Number(blxBalance).toLocaleString() : '--'}{' '}
                    BLX
                  </p>
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="text-white font-medium mb-2">
                  Pool Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Your Pool Share</p>
                    <p className="text-white">
                      {poolShare !== null ? `${poolShare.toFixed(4)}%` : '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Pool Ratio</p>
                    <p className="text-white">
                      {poolRatio ? `1 ETH = ${poolRatio} BLX` : '--'}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleAddLiquidity}
                disabled={loading}
              >
                <Plus className="w-4 h-4 mr-2" />
                {loading ? 'Adding...' : 'Add Liquidity'}
              </Button>

              {txHash && (
                <p className="text-green-400 text-sm mt-2">
                  Success! Tx:{' '}
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {txHash.slice(0, 8)}...
                  </a>
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="swap" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Swap Tokens</CardTitle>
              <CardDescription className="text-gray-400">
                Exchange ETH for BLX or BLX for ETH
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">
                    From ({swapDirection === 'eth-to-blx' ? 'ETH' : 'BLX'})
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={swapFromAmount}
                    onChange={(e) => setSwapFromAmount(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <p className="text-sm text-gray-400">
                    Balance:{' '}
                    {swapDirection === 'eth-to-blx'
                      ? Number(ethBalance).toFixed(4) + ' ETH'
                      : Number(blxBalance).toLocaleString() + ' BLX'}
                  </p>
                </div>

                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleSwapDirectionToggle}
                    className="bg-gray-700 border-gray-600 hover:bg-gray-600"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">
                    To ({swapDirection === 'eth-to-blx' ? 'BLX' : 'ETH'})
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={swapToAmount}
                    readOnly
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Exchange Rate</p>
                    <p className="text-white">
                      {exchangeRate
                        ? swapDirection === 'eth-to-blx'
                          ? `1 ETH = ${exchangeRate.toFixed(2)} BLX`
                          : `1 BLX = ${(1 / exchangeRate).toFixed(6)} ETH`
                        : '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Trading Fee</p>
                    <p className="text-white">0.3%</p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleSwap}
                disabled={loading}
              >
                {loading
                  ? 'Swapping...'
                  : `Swap ${
                      swapDirection === 'eth-to-blx'
                        ? 'ETH for BLX'
                        : 'BLX for ETH'
                    }`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
