import AdminLayout from '../../components/Admin/AdminLayout'
import LeadBank from '../../components/Admin/LeadBank'

export default function OutreachLeads() {
  return (
    <AdminLayout>
      <LeadBank 
        title="Outbound" 
        subtitle="Manage and promote your outbound potential leads."
      />
    </AdminLayout>
  )
}
