import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Head from 'next/head';
import Link from 'next/link';
import { fetchAdminReports, updateReportStatus } from '../../services/api';

const ReportsAdminPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending', 'resolved_no_action', 'resolved_item_removed'

  const loadReports = useCallback(async (page = 1, status = 'pending') => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchAdminReports(status, page, 10);
      setReports(response.data);
      setPagination(response.pagination);
      setCurrentPage(response.pagination.currentPage);
      setStatusFilter(response.pagination.statusFilter);
    } catch (err) {
      setError(err.message || 'Failed to load reports.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports(currentPage, statusFilter);
  }, [loadReports, currentPage, statusFilter]);

  const handleUpdateStatus = async (reportId, newStatus) => {
    if (window.confirm(`Are you sure you want to update report ${reportId} to status: ${newStatus}?`)) {
      try {
        await updateReportStatus(reportId, newStatus);
        // Refresh the current view
        loadReports(currentPage, statusFilter);
      } catch (err) {
        alert(`Error updating report status: ${err.message || 'Failed to update'}`);
      }
    }
  };

  const styles = {
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    th: { border: '1px solid #ddd', padding: '8px', backgroundColor: '#f2f2f2', textAlign: 'left' },
    td: { border: '1px solid #ddd', padding: '8px', verticalAlign: 'top' },
    button: { marginRight: '5px', padding: '3px 7px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9em' },
    filterSection: { marginBottom: '20px' },
    select: { padding: '8px', marginRight: '10px' },
    reasonText: { whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', display: 'inline-block' }
  };

  return (
    <AdminLayout>
      <Head><title>Admin - Content Reports</title></Head>
      <h1>Content Reports Management</h1>

      <div style={styles.filterSection}>
        <label htmlFor="statusFilter">Filter by status: </label>
        <select id="statusFilter" value={statusFilter} onChange={e => {setStatusFilter(e.target.value); setCurrentPage(1);}} style={styles.select}>
          <option value="pending">Pending</option>
          <option value="resolved_no_action">Resolved (No Action)</option>
          <option value="resolved_item_removed">Resolved (Item Removed)</option>
        </select>
      </div>

      {loading && <p>Loading reports...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Item</th>
                <th style={styles.th}>Reason</th>
                <th style={styles.th}>Reported By</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <tr key={report.id}>
                  <td style={styles.td}>{report.id}</td>
                  <td style={styles.td}>
                    {report.item_type === 'topic' && <Link href={`/topics/${report.item_id}`} target="_blank">Topic {report.item_id}</Link>}
                    {report.item_type === 'comment' && <span>Comment {report.item_id} (View on topic page)</span> /* Link would ideally point to topic and scroll to comment */}
                  </td>
                  <td style={styles.td}><div style={styles.reasonText}>{report.reason || 'N/A'}</div></td>
                  <td style={styles.td}>{report.reported_by_name || `User ID: ${report.reported_by_user_id}`}<br/>({report.reported_by_email || 'N/A'})</td>
                  <td style={styles.td}>{new Date(report.created_at).toLocaleString()}</td>
                  <td style={styles.td}>
                    {report.status}
                    {report.status === 'pending' && report.reviewed_by_admin_name && ` (Review started by ${report.reviewed_by_admin_name})`}
                    {report.status !== 'pending' && report.reviewed_by_admin_name && ` by ${report.reviewed_by_admin_name} on ${new Date(report.reviewed_at).toLocaleDateString()}`}
                  </td>
                  <td style={styles.td}>
                    {report.status === 'pending' && (
                      <>
                        <button onClick={() => handleUpdateStatus(report.id, 'resolved_no_action')} style={styles.button}>Resolve (No Action)</button>
                        <button onClick={() => handleUpdateStatus(report.id, 'resolved_item_removed')} style={styles.button}>Resolve (Item Removed)</button>
                      </>
                    )}
                     {report.status !== 'pending' && (
                         <button onClick={() => handleUpdateStatus(report.id, 'pending')} style={styles.button}>Re-open (Set to Pending)</button>
                     )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination Controls */}
          <div style={{ marginTop: '20px' }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={!pagination.currentPage || pagination.currentPage <= 1}>Previous</button>
            <span style={{ margin: '0 10px' }}>Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalReports} reports)</span>
            <button onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))} disabled={!pagination.currentPage || pagination.currentPage >= pagination.totalPages}>Next</button>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default ReportsAdminPage;
