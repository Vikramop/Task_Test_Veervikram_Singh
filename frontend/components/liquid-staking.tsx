"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, ArrowRightLeft, TrendingUp } from "lucide-react"

export function LiquidStaking() {
  const [stakeAmount, setStakeAmount] = useState("")
  const [unstakeAmount, setUnstakeAmount] = useState("")

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Liquid Staking</h1>
        <p className="text-gray-400">Stake BLX tokens and receive stBLX while maintaining liquidity</p>
      </div>

      <Tabs defaultValue="stake" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800">
          <TabsTrigger value="stake" className="data-[state=active]:bg-blue-600">
            Stake BLX
          </TabsTrigger>
          <TabsTrigger value="unstake" className="data-[state=active]:bg-blue-600">
            Unstake stBLX
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stake" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Stake BLX for stBLX
              </CardTitle>
              <CardDescription className="text-gray-400">
                Receive stBLX tokens that represent your staked BLX and earn rewards while maintaining liquidity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-900/20 border border-blue-700 p-4 rounded-lg">
                <h4 className="text-blue-400 font-medium mb-2">How Liquid Staking Works</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Stake BLX tokens and receive stBLX at a 1:1 ratio</li>
                  <li>• stBLX tokens accrue value over time through staking rewards</li>
                  <li>• Use stBLX in other DeFi protocols while earning staking rewards</li>
                  <li>• Unstake anytime by converting stBLX back to BLX</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stake-amount" className="text-white">
                  BLX Amount to Stake
                </Label>
                <Input
                  id="stake-amount"
                  type="number"
                  placeholder="0.0"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <p className="text-sm text-gray-400">Balance: 1,250 BLX</p>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="text-white font-medium mb-3">Staking Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Exchange Rate</p>
                    <p className="text-white">1 BLX = 1 stBLX</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Current APY</p>
                    <p className="text-green-400">6.5%</p>
                  </div>
                  <div>
                    <p className="text-gray-400">You will receive</p>
                    <p className="text-white">{stakeAmount || "0"} stBLX</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Unstaking Period</p>
                    <p className="text-white">Instant</p>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={!stakeAmount}>
                <Shield className="w-4 h-4 mr-2" />
                Stake {stakeAmount || "0"} BLX
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unstake" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <ArrowRightLeft className="w-5 h-5 mr-2" />
                Unstake stBLX for BLX
              </CardTitle>
              <CardDescription className="text-gray-400">Convert your stBLX back to BLX tokens</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="unstake-amount" className="text-white">
                  stBLX Amount to Unstake
                </Label>
                <Input
                  id="unstake-amount"
                  type="number"
                  placeholder="0.0"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <p className="text-sm text-gray-400">Balance: 485.32 stBLX</p>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="text-white font-medium mb-3">Unstaking Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Current Exchange Rate</p>
                    <p className="text-white">1 stBLX = 1.065 BLX</p>
                  </div>
                  <div>
                    <p className="text-gray-400">You will receive</p>
                    <p className="text-white">{(Number.parseFloat(unstakeAmount || "0") * 1.065).toFixed(4)} BLX</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Unstaking Fee</p>
                    <p className="text-white">0%</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Processing Time</p>
                    <p className="text-white">Instant</p>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={!unstakeAmount}>
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Unstake {unstakeAmount || "0"} stBLX
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Your Liquid Staking Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                  <p className="text-gray-400 text-sm">Total stBLX</p>
                  <p className="text-2xl font-bold text-white">485.32</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                  <p className="text-gray-400 text-sm">Equivalent BLX</p>
                  <p className="text-2xl font-bold text-white">516.87</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                  <p className="text-gray-400 text-sm">Rewards Earned</p>
                  <p className="text-2xl font-bold text-green-400">31.55</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
