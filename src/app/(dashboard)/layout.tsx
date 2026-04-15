'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Building2, LayoutDashboard, Users, Home, CreditCard,
  TrendingDown, MessageSquare, Settings, LogOut, ChevronDown,
  Menu, Plus, FileText, Banknote
} from 'lucide-react'

interface Site {
  id: string
  name: string
  city: string | null
}

interface Profile {
  full_name: string | null
}

interface SiteContextType {
  sites: Site[]
  activeSite: Site | null
  setActiveSite: (site: Site) => void
}

const SiteContext = createContext<SiteContextType>({ sites: [], activeSite: null, setActiveSite: () => {} })

export const useSite = () => useContext(SiteContext)

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/residents', icon: Users, label: 'Sakinler' },
  { href: '/units', icon: Home, label: 'Daireler' },
  { href: '/dues', icon: CreditCard, label: 'Aidat Takibi' },
  { href: '/expenses', icon: TrendingDown, label: 'Giderler' },
  { href: '/banking', icon: Banknote, label: 'Banka Hesapları' },
  { href: '/reports', icon: FileText, label: 'Raporlar' },
  { href: '/whatsapp', icon: MessageSquare, label: 'WhatsApp' },
]

function Sidebar({ activeSite, sites, setActiveSite, siteOpen, setSiteOpen, profile, pathname, setSidebarOpen, handleLogout }: any) {
  return (
    <aside className="flex flex-col h-full bg-[#13161f] border-r border-white/5 w-64">
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg">SitePanel</span>
        </div>
      </div>
      <div className="px-3 py-3 border-b border-white/5">
        <p className="text-xs text-gray-600 uppercase tracking-wider mb-2 px-2">Aktif Site</p>
        <div className="relative">
          <button onClick={() => setSiteOpen(!siteOpen)} className="w-full flex items-center justify-between gap-2 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3 py-2.5 transition-all">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 bg-indigo-500/20 rounded-md flex items-center justify-center flex-shrink-0">
                <Building2 className="w-3 h-3 text-indigo-400" />
              </div>
              <span className="text-white text-sm truncate">{activeSite?.name ?? 'Site seçin'}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${siteOpen ? 'rotate-180' : ''}`} />
          </button>
          {siteOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1f2e] border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl">
              {sites.map((site: Site) => (
                <button key={site.id} onClick={() => setActiveSite(site)} className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2 ${activeSite?.id === site.id ? 'bg-indigo-600/20 text-indigo-300' : 'text-gray-300 hover:bg-white/5'}`}>
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{site.name}</span>
                </button>
              ))}
              <div className="border-t border-white/5">
                <Link href="/sites/new" onClick={() => setSiteOpen(false)} className="w-full text-left px-3 py-2.5 text-sm text-indigo-400 hover:bg-white/5 flex items-center gap-2 transition-colors">
                  <Plus className="w-3.5 h-3.5" />Yeni Site Ekle
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="text-xs text-gray-600 uppercase tracking-wider mb-2 px-2">Menü</p>
        {navItems.map((item) => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <item.icon className="w-4 h-4 flex-shrink-0" />{item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 py-3 border-t border-white/5 space-y-0.5">
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all">
          <Settings className="w-4 h-4" />Ayarlar
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-all">
          <LogOut className="w-4 h-4" />Çıkış Yap
        </button>
        <div className="px-3 py-2 mt-1">
          <p className="text-xs text-gray-600 truncate">{profile?.full_name ?? ''}</p>
        </div>
      </div>
    </aside>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sites, setSites] = useState<Site[]>([])
  const [activeSite, setActiveSiteState] = useState<Site | null>(null)
  const [siteOpen, setSiteOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, company_id')
        .eq('id', user.id)
        .single()
      
      if (prof) {
        setProfile({ full_name: prof.full_name })
        
        if (prof.company_id) {
          const { data: sitesData } = await supabase
            .from('sites')
            .select('id, name, city')
            .eq('company_id', prof.company_id)
            .order('created_at')
          
          if (sitesData?.length) { 
            setSites(sitesData)
            setActiveSiteState(sitesData[0])
          }
        }
      }
      setLoading(false)
    }
    load()
  }, [router])

  function setActiveSite(site: Site) { setActiveSiteState(site); setSiteOpen(false) }
  
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0F1117]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <SiteContext.Provider value={{ sites, activeSite, setActiveSite }}>
      <div className="flex h-screen bg-[#0F1117] overflow-hidden">
        <div className="hidden lg:flex flex-shrink-0">
          <Sidebar activeSite={activeSite} sites={sites} setActiveSite={setActiveSite} siteOpen={siteOpen} setSiteOpen={setSiteOpen} profile={profile} pathname={pathname} setSidebarOpen={setSidebarOpen} handleLogout={handleLogout} />
        </div>
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-64">
              <Sidebar activeSite={activeSite} sites={sites} setActiveSite={setActiveSite} siteOpen={siteOpen} setSiteOpen={setSiteOpen} profile={profile} pathname={pathname} setSidebarOpen={setSidebarOpen} handleLogout={handleLogout} />
            </div>
          </div>
        )}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0F1117]">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white transition-colors">
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-white font-semibold text-lg">{navItems.find(n => n.href === pathname)?.label ?? 'SitePanel'}</h1>
                {activeSite && <p className="text-gray-500 text-xs">{activeSite.name}{activeSite.city ? ` · ${activeSite.city}` : ''}</p>}
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SiteContext.Provider>
  )
}
