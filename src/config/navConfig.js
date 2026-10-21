import { Home, Compass, MapPin, Bell, User, LayoutDashboard } from 'lucide-react'

// All normal users (traveler or legacy guide) share one nav
// Authority has its own separate nav
export const NAV_CONFIG = {
  user: [
    { label: 'Home',    path: '/home',    icon: Home },
    { label: 'Trip',    path: '/trip',    icon: Compass },
    { label: 'Map',     path: '/map',     icon: MapPin },
    { label: 'Alerts',  path: '/alerts',  icon: Bell },
    { label: 'Profile', path: '/profile', icon: User },
  ],
  authority: [
    { label: 'Dashboard', path: '/authority', icon: LayoutDashboard },
    { label: 'Alerts',    path: '/alerts',    icon: Bell },
    { label: 'Map',       path: '/map',       icon: MapPin },
    { label: 'Profile',   path: '/profile',   icon: User },
  ],
}

// Default home page per role
export const ROLE_HOMES = {
  traveler:  '/home',
  guide:     '/home',   // legacy guide accounts land on home too
  authority: '/authority',
}

// Which routes each role may access
export const ROLE_ALLOWED_ROUTES = {
  traveler:  ['/home', '/trip', '/map', '/alerts', '/profile'],
  guide:     ['/home', '/trip', '/map', '/alerts', '/profile'],
  authority: ['/authority', '/alerts', '/map', '/profile'],
}
