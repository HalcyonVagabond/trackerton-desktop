import { useState, useEffect } from 'react';

export function useTaskTimeStats(taskId: number | null) {
  const [totalDuration, setTotalDuration] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setTotalDuration(0);
      return;
    }

    const fetchTotalDuration = async () => {
      setLoading(true);
      try {
        const duration = await window.electronAPI.getTotalDurationByTask(taskId);
        setTotalDuration(duration || 0);
      } catch (error) {
        console.error('Error fetching task time stats:', error);
        setTotalDuration(0);
      } finally {
        setLoading(false);
      }
    };

    fetchTotalDuration();
  }, [taskId]);

  const reload = async (): Promise<void> => {
    if (!taskId) {
      setTotalDuration(0);
      return;
    }
    try {
      const duration = await window.electronAPI.getTotalDurationByTask(taskId);
      setTotalDuration(duration || 0);
    } catch (error) {
      console.error('Error reloading task time stats:', error);
    }
  };

  return { totalDuration, loading, reload };
}
