'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface ContactSubmission {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
  subject: string;
  message: string;
  status: 'pending' | 'contacted' | 'converted' | 'rejected';
  notes?: string;
  submittedAt: string;
  respondedAt?: string;
}

export default function ContactSubmissionsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'super_admin') {
      router.push('/dashboard');
      return;
    }
    fetchSubmissions();
  }, [user, router, filter]);

  const fetchSubmissions = async () => {
    try {
      const url = filter === 'all' 
        ? '/api/superadmin/contacts'
        : `/api/superadmin/contacts?status=${filter}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions);
      } else {
        toast.error('Failed to load submissions');
      }
    } catch (error) {
      toast.error('Failed to load submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (submissionId: string, status: string) => {
    try {
      const res = await fetch('/api/superadmin/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, status, notes })
      });

      if (res.ok) {
        toast.success('Status updated');
        setShowModal(false);
        setSelectedSubmission(null);
        setNotes('');
        fetchSubmissions();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleCreateBusiness = (submission: ContactSubmission) => {
    // Navigate to business creation with pre-filled data
    router.push(`/superadmin/businesses/create?email=${submission.email}&name=${submission.name}&businessName=${submission.businessName || ''}`);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-white via-white to-white dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Contact Submissions</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage inquiries from potential customers</p>
          </div>
          <Button onClick={() => router.push('/superadmin')}>← Back</Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {['all', 'pending', 'contacted', 'converted', 'rejected'].map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>

        {/* Submissions List */}
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <Card glass>
              <CardBody>
                <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                  No submissions found
                </p>
              </CardBody>
            </Card>
          ) : (
            submissions.map((submission) => (
              <Card key={submission._id} glass hover>
                <CardBody>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold">{submission.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          submission.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          submission.status === 'contacted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          submission.status === 'converted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {submission.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Email</p>
                          <p className="text-sm font-semibold">{submission.email}</p>
                        </div>
                        {submission.phone && (
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Phone</p>
                            <p className="text-sm font-semibold">{submission.phone}</p>
                          </div>
                        )}
                        {submission.businessName && (
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Business Name</p>
                            <p className="text-sm font-semibold">{submission.businessName}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Submitted</p>
                          <p className="text-sm font-semibold">
                            {format(new Date(submission.submittedAt), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Subject: {submission.subject}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {submission.message}
                        </p>
                      </div>

                      {submission.notes && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                          <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">Notes:</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">{submission.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setNotes(submission.notes || '');
                          setShowModal(true);
                        }}
                      >
                        Update Status
                      </Button>
                      {submission.status !== 'converted' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCreateBusiness(submission)}
                        >
                          Create Business
                        </Button>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>

        {/* Update Status Modal */}
        {showModal && selectedSubmission && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <h2 className="text-2xl font-bold">Update Status</h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['pending', 'contacted', 'converted', 'rejected'].map((status) => (
                        <Button
                          key={status}
                          variant={selectedSubmission.status === status ? 'primary' : 'ghost'}
                          size="sm"
                          onClick={() => setSelectedSubmission({ ...selectedSubmission, status: status as any })}
                          className="capitalize"
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      rows={4}
                      placeholder="Add notes about this submission..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleUpdateStatus(selectedSubmission._id, selectedSubmission.status)}
                      className="flex-1"
                    >
                      Save Changes
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowModal(false);
                        setSelectedSubmission(null);
                        setNotes('');
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
