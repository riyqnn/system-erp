# Odoo-Style Admin Dashboard

A premium enterprise admin dashboard with an Odoo-inspired ERP aesthetic using a White & Red color palette.

## Design Philosophy

- **Primary Color**: Deep Red (#DC2626, #B91C1C) for buttons, active states, and accents
- **Background**: Pure White (#FFFFFF) for clean, premium feel
- **Accents**: Light red/pinkish tint (bg-red-50) for highlights
- **Borders**: Soft gray (border-slate-200) for modular sections

## Features

### ERP Header
- White top bar with red breadcrumb accents
- Secondary navigation with active state indicators
- User avatar and quick actions

### KPI Dashboard
- Metric cards with red accent colors
- Mini area charts with red gradients
- Trend indicators (up/down arrows)
- Responsive grid layout

### Icon Footer
- Persistent footer navigation
- Neutral gray icons that turn red when active
- Fixed positioning for easy access

### Odoo Form Components
- Centered white card design ("document" aesthetic)
- Red action buttons (solid for Save, ghost for Cancel)
- Permission toggles with red-themed switches
- Section-based form organization

### User Management
- Odoo-style data tables with filtering
- Search functionality
- Status filters (All, Pending, Active)
- Red badges for status indicators
- Inline approve/reject actions

## Component Structure

```
app/admin/
├── page.tsx                          # Main admin dashboard
├── AdminDashboardClient.tsx          # Dashboard with KPI widgets
└── pending-users/
    ├── page.tsx                      # User management page
    └── UserManagementPageClient.tsx  # User table & filters

components/admin/
├── OdooFormCard.tsx                  # Reusable form components
├── AddUserModal.tsx                  # Add user modal with permissions
├── KPICard.tsx                       # KPI widget components
└── index.ts                          # Component exports
```

## Usage

### Creating a New Admin Page

```tsx
import { requireAdmin } from '@/lib/auth/server-auth'

export default async function NewAdminPage() {
  await requireAdmin()
  return <YourClientComponent />
}
```

### Using Odoo Form Components

```tsx
import {
  OdooFormCard,
  OdooFormSection,
  OdooFormField,
  OdooToggle,
  OdooButton
} from '@/components/admin'

function MyForm() {
  return (
    <OdooFormCard title="Form Title" description="Form description">
      <OdooFormSection title="Section Title" icon={<Icon />}>
        <OdooFormField label="Field Label" required>
          <Input />
        </OdooFormField>
      </OdooFormSection>
    </OdooFormCard>
  )
}
```

### Using KPI Cards

```tsx
import { KPICard } from '@/components/admin'
import { Users } from 'lucide-react'

<KPICard
  title="Total Users"
  value="1,234"
  change={12.5}
  trend="up"
  icon={<Users />}
  description="Active users"
/>
```

## Color Palette Reference

```css
/* Primary Red */
--red-600: #DC2626
--red-700: #B91C1C
--red-50: #FEF2F2

/* Neutral */
--slate-50: #F8FAFC
--slate-200: #E2E8F0
--slate-900: #0F172A

/* Status Colors */
--green-600: #16A34A
--yellow-500: #EAB308
```

## Access Control

All admin pages are protected with `requireAdmin()` middleware:
- Only users with ADMIN role can access
- Automatic redirect to dashboard for unauthorized users
- Server-side protection for all API routes

## Future Enhancements

- [ ] Advanced analytics with real-time data
- [ ] Export functionality (CSV, PDF)
- [ ] Bulk actions for user management
- [ ] Activity logging and audit trails
- [ ] Role management interface
- [ ] System settings page
- [ ] Notification system
