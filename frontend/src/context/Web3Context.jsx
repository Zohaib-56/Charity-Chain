import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { CHARITY_FACTORY_ABI } from '../abi/contracts'

const FACTORY_ADDRESS = import.meta.env.VITE_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000'

const Web3Context = createContext(null)

export function Web3Provider({ children }) {
  const [provider,        setProvider]        = useState(null)
  const [signer,          setSigner]          = useState(null)
  const [account,         setAccount]         = useState(null)
  const [chainId,         setChainId]         = useState(null)
  const [factoryContract, setFactoryContract] = useState(null)
  const [isOwner,         setIsOwner]         = useState(false)
  const [ngoInfo,         setNgoInfo]         = useState(null)
  const [connecting,      setConnecting]      = useState(false)

  const HARDHAT_CHAIN_ID = '0x7a69'
  const SEPOLIA_CHAIN_ID = '0xaa36a7'

  const connect = useCallback(async (silent = false) => {
    if (!window.ethereum) {
      if (!silent) toast.error('MetaMask not found. Please install it from metamask.io')
      return
    }
    setConnecting(true)
    try {
      const _provider = new ethers.BrowserProvider(window.ethereum)
      const method = silent ? 'eth_accounts' : 'eth_requestAccounts'
      const accounts = await _provider.send(method, [])
      if (silent && accounts.length === 0) return

      const _signer  = await _provider.getSigner()
      const _account = await _signer.getAddress()
      const network  = await _provider.getNetwork()
      const _chainId = '0x' + network.chainId.toString(16)

      const _factory = new ethers.Contract(FACTORY_ADDRESS, CHARITY_FACTORY_ABI, _signer)
      const owner    = await _factory.owner()
      const _isOwner = owner.toLowerCase() === _account.toLowerCase()

      let _ngoInfo = null
      try {
        const info = await _factory.getNGOInfo(_account)
        if (info.isRegistered) _ngoInfo = info
      } catch (_) {}

      setProvider(_provider)
      setSigner(_signer)
      setAccount(_account)
      setChainId(_chainId)
      setFactoryContract(_factory)
      setIsOwner(_isOwner)
      setNgoInfo(_ngoInfo)

      if (!silent) toast.success('Wallet connected!')
    } catch (err) {
      if (!silent) toast.error(err.message?.includes('user rejected') ? 'Connection cancelled' : 'Failed to connect wallet')
    } finally {
      setConnecting(false)
    }
  }, [])

  const connectWallet   = useCallback(() => connect(false), [connect])
  const reconnectSilent = useCallback(() => connect(true),  [connect])

  useEffect(() => { reconnectSilent() }, [])

  const disconnectWallet = useCallback(() => {
    setProvider(null); setSigner(null); setAccount(null)
    setChainId(null);  setFactoryContract(null)
    setIsOwner(false); setNgoInfo(null)
    toast('Wallet disconnected', { icon: '👋' })
  }, [])

  useEffect(() => {
    if (!window.ethereum) return
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) disconnectWallet()
      else connect(true)
    }
    const handleChainChanged = () => window.location.reload()
    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged',    handleChainChanged)
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener('chainChanged',    handleChainChanged)
    }
  }, [connect, disconnectWallet])

  const refreshNgoInfo = useCallback(async () => {
    if (!factoryContract || !account) return
    try {
      const info = await factoryContract.getNGOInfo(account)
      setNgoInfo(info.isRegistered ? info : null)
    } catch (_) {}
  }, [factoryContract, account])

  const shortAddress     = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : null
  const isCorrectNetwork = chainId === HARDHAT_CHAIN_ID || chainId === SEPOLIA_CHAIN_ID

  return (
    <Web3Context.Provider value={{
      provider, signer, account, chainId,
      factoryContract, isOwner, ngoInfo,
      connecting, shortAddress, isCorrectNetwork,
      connectWallet, disconnectWallet, refreshNgoInfo,
      FACTORY_ADDRESS,
    }}>
      {children}
    </Web3Context.Provider>
  )
}

export const useWeb3 = () => {
  const ctx = useContext(Web3Context)
  if (!ctx) throw new Error('useWeb3 must be used within Web3Provider')
  return ctx
}
