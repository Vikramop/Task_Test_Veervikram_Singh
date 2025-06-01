"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Coins, Clock, TrendingUp } from "lucide-react"

const stakingPeriods = [
  { value: "30", label: "30 Days", apy: "5%" },
  { value: "90", label: "90 Days", apy: "8%" },
  { value: "180", label: "180 Days", apy: "12%" },
  { value: "365", label: "1 Year", apy: "18%" },
]

export function Staking() {
  const [stakeAmount, setStakeAmount] = useState("")
  const [stakePeriod, setStakePeriod] = useState("")
  const [selectedToken, setSelectedToken] = useState("eth")

  const selectedPeriod = stakingPeriods.find((p) => p.value === stakePeriod)

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Staking</h1>
        <p className="text-gray-400">Stake your tokens to earn rewards with variable APY based on duration</p>
      </div>

      <Tabs defaultValue="stake" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800">
          <TabsTrigger value="stake" className="data-[state=active]:bg-blue-600">
            Stake Tokens
          </TabsTrigger>
          <TabsTrigger value="manage" className="data-[state=active]:bg-blue-600">
            Manage Stakes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stake" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Stake Your Tokens</CardTitle>
              <CardDescription className="text-gray-400">
                Choose your token, amount, and staking period to start earning rewards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-white">Select Token</Label>
                  <Select value={selectedToken} onValueChange={setSelectedToken}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="eth">ETH</SelectItem>
                      <SelectItem value="blx">BLX</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-400">Balance: {selectedToken === "eth" ? "2.5 ETH" : "1,250 BLX"}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Staking Period</Label>
                  <Select value={stakePeriod} onValueChange={setStakePeriod}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {stakingPeriods.map((period) => (
                        <SelectItem key={period.value} value={period.value}>
                          {period.label} - {period.apy} APY
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Amount to Stake</Label>
                <Input
                  type="number"
                  placeholder="0.0"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              {selectedPeriod && stakeAmount && (
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h4 className="text-white font-medium mb-3">Staking Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Staking Amount</p>
                      <p className="text-white">
                        {stakeAmount} {selectedToken.toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">APY</p>
                      <p className="text-green-400">{selectedPeriod.apy}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Duration</p>
                      <p className="text-white">{selectedPeriod.label}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Estimated Rewards</p>
                      <p className="text-green-400">
                        {(
                          (Number.parseFloat(stakeAmount || "0") * Number.parseFloat(selectedPeriod.apy)) /
                          100
                        ).toFixed(4)}{" "}
                        {selectedToken.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={!stakeAmount || !stakePeriod}>
                <Coins className="w-4 h-4 mr-2" />
                Stake Tokens
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <div className="grid gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Active Stakes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-white font-medium">ETH Stake #1</h4>
                        <p className="text-gray-400 text-sm">Started 15 days ago</p>
                      </div>
                      <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">Active</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-400">Amount</p>
                        <p className="text-white">1.5 ETH</p>
                      </div>
                      <div>
                        <p className="text-gray-400">APY</p>
                        <p className="text-green-400">12%</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Time Left</p>
                        <p className="text-white">165 days</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Rewards</p>
                        <p className="text-green-400">0.074 ETH</p>
                      </div>
                    </div>
                    <Button variant="destructive" size="sm">
                      Unstake (Early withdrawal penalty: 5%)
                    </Button>
                  </div>

                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-white font-medium">BLX Stake #1</h4>
                        <p className="text-gray-400 text-sm">Started 85 days ago</p>
                      </div>
                      <span className="bg-yellow-600 text-white px-2 py-1 rounded text-xs">Ending Soon</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-400">Amount</p>
                        <p className="text-white">500 BLX</p>
                      </div>
                      <div>
                        <p className="text-gray-400">APY</p>
                        <p className="text-green-400">8%</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Time Left</p>
                        <p className="text-white">5 days</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Rewards</p>
                        <p className="text-green-400">9.32 BLX</p>
                      </div>
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
                      <Clock className="w-4 h-4 mr-2" />
                      Claim Rewards
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
