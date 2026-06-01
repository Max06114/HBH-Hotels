import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Clock, Play, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SchedulerManagement = () => {
  const { language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchSchedulerStatus();
  }, []);

  const fetchSchedulerStatus = async () => {
    try {
      const response = await axios.get(`${API}/admin/scheduler/status`, { headers: getAuthHeaders() });
      setSchedulerStatus(response.data);
    } catch (error) {
      console.error('Error fetching scheduler status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunReminders = async () => {
    setRunning(true);
    try {
      const response = await axios.post(`${API}/admin/scheduler/run-reminders`, {}, { headers: getAuthHeaders() });
      toast.success(language === 'de' 
        ? `Job ausgeführt: ${response.data.result.sent} gesendet, ${response.data.result.failed} fehlgeschlagen` 
        : `Job executed: ${response.data.result.sent} sent, ${response.data.result.failed} failed`);
      fetchSchedulerStatus();
    } catch (error) {
      toast.error(language === 'de' ? 'Fehler beim Ausführen' : 'Error running job');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" /></div>;
  }

  return (
    <div data-testid="admin-scheduler">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-serif text-3xl text-[#1A1A1A]">
          {language === 'de' ? 'Automatisierung' : 'Automation'}
        </h1>
      </div>

      {/* Scheduler Status */}
      <Card className="border-[#E5E0D5] mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {language === 'de' ? 'Scheduler Status' : 'Scheduler Status'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-3 h-3 rounded-full ${schedulerStatus?.scheduler_running ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="font-medium">
              {schedulerStatus?.scheduler_running 
                ? (language === 'de' ? 'Scheduler läuft' : 'Scheduler running')
                : (language === 'de' ? 'Scheduler gestoppt' : 'Scheduler stopped')}
            </span>
          </div>
          
          {schedulerStatus?.jobs?.length > 0 && (
            <div className="bg-[#F5F2EA] rounded-lg p-4 mb-4">
              <h4 className="font-medium mb-2">{language === 'de' ? 'Geplante Jobs:' : 'Scheduled Jobs:'}</h4>
              {schedulerStatus.jobs.map((job) => (
                <div key={job.id} className="text-sm mb-2">
                  <p className="font-medium">{job.name}</p>
                  <p className="text-[#4A4A4A]">
                    {language === 'de' ? 'Nächste Ausführung:' : 'Next run:'}{' '}
                    {job.next_run ? new Date(job.next_run).toLocaleString('de-DE', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '-'}
                  </p>
                  <p className="text-xs text-[#6B1D2A]">{job.trigger}</p>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={handleRunReminders}
            disabled={running}
            className="bg-[#6B1D2A] hover:bg-[#8A2536]"
            data-testid="run-reminders-btn"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {language === 'de' ? 'Erinnerungen jetzt senden' : 'Run Reminders Now'}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Job Runs */}
      <Card className="border-[#E5E0D5]">
        <CardHeader>
          <CardTitle>
            {language === 'de' ? 'Letzte Ausführungen' : 'Recent Runs'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'de' ? 'Zeitpunkt' : 'Timestamp'}</TableHead>
                  <TableHead>{language === 'de' ? 'Verarbeitet' : 'Processed'}</TableHead>
                  <TableHead>{language === 'de' ? 'Gesendet' : 'Sent'}</TableHead>
                  <TableHead>{language === 'de' ? 'Fehlgeschlagen' : 'Failed'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedulerStatus?.recent_runs?.length > 0 ? (
                  schedulerStatus.recent_runs.map((run) => (
                    <TableRow key={run.run_at}>
                      <TableCell>{new Date(run.run_at).toLocaleString('de-DE')}</TableCell>
                      <TableCell>{run.bookings_processed}</TableCell>
                      <TableCell className="text-green-600">{run.sent_count}</TableCell>
                      <TableCell className="text-red-600">{run.failed_count}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-[#4A4A4A]">
                      {language === 'de' ? 'Noch keine Ausführungen' : 'No runs yet'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-[#F5F2EA] rounded-lg">
        <p className="text-sm text-[#4A4A4A]">
          <strong>{language === 'de' ? 'Info:' : 'Info:'}</strong>{' '}
          {language === 'de' 
            ? 'Der Scheduler läuft automatisch jeden Montag um 9:00 Uhr (UTC) und sendet Zahlungserinnerungen an alle Buchungen, deren Anreise in 6-7 Wochen ist und die noch nicht erinnert wurden.'
            : 'The scheduler runs automatically every Monday at 9:00 AM (UTC) and sends payment reminders to all bookings with check-in in 6-7 weeks that haven\'t been reminded yet.'}
        </p>
      </div>
    </div>
  );
};

export default SchedulerManagement;
