import { Home, Compass, MapPin, Bell, User, Users, AlertTriangle, LayoutDashboard } from 'lucide-react'

export const NAV_CONFIG = {
  traveler: [
    { label: 'Home', path: '/home', icon: Home },
    { label: 'Trips', path: '/trips', icon: Compass },
    { label: 'Map', path: '/map', icon: MapPin },
    { label: 'Alerts', path: '/alerts', icon: Bell },
    { label: 'Profile', path: '/profile', icon: User },
  ],
  guide: [
    { label: 'Dashboard', path: '/guide', icon: LayoutDashboard },
    { label: 'Group', path: '/group', icon: Users },
    { label: 'Map', path: '/map', icon: MapPin },
    { label: 'SOS', path: '/sos', icon: AlertTriangle },
    { label: 'Profile', path: '/profile', icon: User },
  ],
  authority: [
    { label: 'Dashboard', path: '/authority', icon: LayoutDashboard },
    { label: 'Alerts', path: '/alerts', icon: Bell },
    { label: 'Map', path: '/map', icon: MapPin },
    { label: 'Profile', path: '/profile', icon: User },
  ],
}

export const ROLE_HOMES = {
  traveler: '/home',
  guide: '/guide',
  authority: '/authority',
}

export const ROLE_ALLOWED_ROUTES = {
  traveler: ['/home', '/trips', '/map', '/alerts', '/profile'],
  guide: ['/guide', '/group', '/map', '/sos', '/profile'],
  authority: ['/authority', '/alerts', '/map', '/profile'],
}
