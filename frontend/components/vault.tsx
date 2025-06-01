"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { VaultIcon, Pause, Play, TrendingUp, Clock } from "lucide-react"

export function Vault() {
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [vaultPaused, setVaultPaused] = useState(false)

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Vault</h1>
        <p className="text-gray-400">Long-term investment vault with compound interest</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Current APY</p>
            <p className="text-2xl font-bold text-green-400">15.2%</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 text-center">
            <VaultIcon className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Total Value Locked</p>
            <p className="text-2xl font-bold text-white">$2.4M</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 text-center">
            <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Vault Status</p>
            <Badge variant={vaultPaused ? "destructive" : "default"} className="text-sm">
              {vaultPaused ? "Paused" : "Active"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="deposit" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
          <TabsTrigger value="deposit" className="data-[state=active]:bg-blue-600">
            Deposit
          </TabsTrigger>
          <TabsTrigger value="withdraw" className="data-[state=active]:bg-blue-600">
            Withdraw
          </TabsTrigger>
          <TabsTrigger value="manage" className="data-[state=active]:bg-blue-600">
            Manage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deposit" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Deposit to Vault</CardTitle>
              <CardDescription className="text-gray-400">
                Deposit ETH or BLX tokens for long-term investment with compound interest
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {vaultPaused && (
                <div className="bg-red-900/20 border border-red-700 p-4 rounded-lg">
                  <p className="text-red-400 text-sm">
                    ⚠️ Vault is currently paused. Deposits are temporarily disabled.
                  </p>
                </div>
              )}

              <div className="bg-blue-900/20 border border-blue-700 p-4 rounded-lg">
                <h4 className="text-blue-400 font-medium mb-2">Vault Features</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Compound interest calculated daily</li>
                  <li>• Higher APY for longer lock periods</li>
                  <li>• Automatic reinvestment of rewards</li>
                  <li>• Flexible withdrawal options</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit-amount" className="text-white">
                  Deposit Amount (ETH)
                </Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  placeholder="0.0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  disabled={vaultPaused}
                />
                <p className="text-sm text-gray-400">Balance: 2.5 ETH</p>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="text-white font-medium mb-3">Investment Projection</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Initial Deposit</p>
                    <p className="text-white">{depositAmount || "0"} ETH</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Current APY</p>
                    <p className="text-green-400">15.2%</p>
                  </div>
                  <div>
                    <p className="text-gray-400">1 Year Projection</p>
                    <p className="text-green-400">{(Number.parseFloat(depositAmount || "0") * 1.152).toFixed(4)} ETH</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Estimated Profit</p>
                    <p className="text-green-400">{(Number.parseFloat(depositAmount || "0") * 0.152).toFixed(4)} ETH</p>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={!depositAmount || vaultPaused}>
                <VaultIcon className="w-4 h-4 mr-2" />
                Deposit to Vault
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdraw" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Withdraw from Vault</CardTitle>
              <CardDescription className="text-gray-400">
                Withdraw your deposited funds plus earned interest
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="text-white font-medium mb-3">Your Vault Position</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Total Deposited</p>
                    <p className="text-white">3.2 ETH</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Interest Earned</p>
                    <p className="text-green-400">0.487 ETH</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Value</p>
                    <p className="text-white">3.687 ETH</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Days Invested</p>
                    <p className="text-white">127 days</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="withdraw-amount" className="text-white">
                  Withdrawal Amount (ETH)
                </Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  placeholder="0.0"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <p className="text-sm text-gray-400">Available: 3.687 ETH</p>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-700 p-4 rounded-lg">
                <h4 className="text-yellow-400 font-medium mb-2">Withdrawal Fees</h4>
                <div className="text-sm text-gray-300 space-y-1">
                  <p>• 0-30 days: 5% early withdrawal fee</p>
                  <p>• 30-90 days: 2% withdrawal fee</p>
                  <p>• 90+ days: No withdrawal fee</p>
                </div>
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={!withdrawAmount}>
                Withdraw {withdrawAmount || "0"} ETH
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Vault Management</CardTitle>
              <CardDescription className="text-gray-400">Administrative controls for the vault</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="text-white font-medium mb-3">Vault Status</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">
                      Current Status:
                      <Badge variant={vaultPaused ? "destructive" : "default"} className="ml-2">
                        {vaultPaused ? "Paused" : "Active"}
                      </Badge>
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      {vaultPaused
                        ? "Deposits and new investments are paused"
                        : "Vault is accepting deposits and generating returns"}
                    </p>
                  </div>
                  <Button
                    variant={vaultPaused ? "default" : "destructive"}
                    onClick={() => setVaultPaused(!vaultPaused)}
                    className="ml-4"
                  >
                    {vaultPaused ? (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Resume Vault
                      </>
                    ) : (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Pause Vault
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="text-white font-medium mb-3">Vault Statistics</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Total Deposits</p>
                    <p className="text-white">156.7 ETH</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Active Users</p>
                    <p className="text-white">47</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Average Deposit</p>
                    <p className="text-white">3.33 ETH</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Interest Paid</p>
                    <p className="text-green-400">23.8 ETH</p>
                  </div>
                </div>
              </div>

              {vaultPaused && (
                <div className="bg-red-900/20 border border-red-700 p-4 rounded-lg">
                  <h4 className="text-red-400 font-medium mb-2">Vault Paused</h4>
                  <p className="text-gray-300 text-sm">
                    The vault is currently paused. New deposits are disabled, but existing investments continue to earn
                    interest. Users can still withdraw their funds.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
