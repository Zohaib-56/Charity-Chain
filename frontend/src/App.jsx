import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Web3Provider } from './context/Web3Context'
import Navbar         from './components/Navbar'
import Home           from './pages/Home'
import Campaigns      from './pages/Campaigns'
import CampaignDetail from './pages/CampaignDetail'
import Dashboard      from './pages/Dashboard'

export default function App() {
  return (
    <Web3Provider>
      <Navbar />
      <Routes>
        <Route path="/"                element={<Home />} />
        <Route path="/campaigns"       element={<Campaigns />} />
        <Route path="/campaign/:address" element={<CampaignDetail />} />
        <Route path="/dashboard"       element={<Dashboard />} />
        <Route path="/register-ngo"    element={<Dashboard />} />
      </Routes>
    </Web3Provider>
  )
}
