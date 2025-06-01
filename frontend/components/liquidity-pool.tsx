"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowUpDown, Plus } from "lucide-react"

export function LiquidityPool() {
  const [ethAmount, setEthAmount] = useState("")
  const [blxAmount, setBlxAmount] = useState("")
  const [swapFromAmount, setSwapFromAmount] = useState("")
  const [swapToAmount, setSwapToAmount] = useState("")
  const [swapDirection, setSwapDirection] = useState<"eth-to-blx" | "blx-to-eth">("eth-to-blx")

  const handleSwapDirectionToggle = () => {
    setSwapDirection(swapDirection === "eth-to-blx" ? "blx-to-eth" : "eth-to-blx")
    setSwapFromAmount(swapToAmount)
    setSwapToAmount(swapFromAmount)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Liquidity Pool</h1>
        <p className="text-gray-400">Add liquidity or swap tokens in the ETH/BLX pool</p>
      </div>

      <Tabs defaultValue="add-liquidity" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800">
          <TabsTrigger value="add-liquidity" className="data-[state=active]:bg-blue-600">
            Add Liquidity
          </TabsTrigger>
          <TabsTrigger value="swap" className="data-[state=active]:bg-blue-600">
            Swap Tokens
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add-liquidity" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Add Liquidity to ETH/BLX Pool</CardTitle>
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
                  <p className="text-sm text-gray-400">Balance: 2.5 ETH</p>
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
                  <p className="text-sm text-gray-400">Balance: 1,250 BLX</p>
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="text-white font-medium mb-2">Pool Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Your Pool Share</p>
                    <p className="text-white">0.05%</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Pool Ratio</p>
                    <p className="text-white">1 ETH = 500 BLX</p>
                  </div>
                </div>
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Liquidity
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="swap" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Swap Tokens</CardTitle>
              <CardDescription className="text-gray-400">Exchange ETH for BLX or BLX for ETH</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">From ({swapDirection === "eth-to-blx" ? "ETH" : "BLX"})</Label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={swapFromAmount}
                    onChange={(e) => setSwapFromAmount(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <p className="text-sm text-gray-400">
                    Balance: {swapDirection === "eth-to-blx" ? "2.5 ETH" : "1,250 BLX"}
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
                  <Label className="text-white">To ({swapDirection === "eth-to-blx" ? "BLX" : "ETH"})</Label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={swapToAmount}
                    onChange={(e) => setSwapToAmount(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    readOnly
                  />
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Exchange Rate</p>
                    <p className="text-white">1 ETH = 500 BLX</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Trading Fee</p>
                    <p className="text-white">0.3%</p>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Swap {swapDirection === "eth-to-blx" ? "ETH for BLX" : "BLX for ETH"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
