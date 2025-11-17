'use client';

import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { DateRange } from '@/types';

interface DateRangePickerProps {
  onDateChange: (range: DateRange) => void;
  initialRange?: DateRange;
}

// Helper to calculate date range from today backwards
function getDefaultDateRange(days: number): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const endDate = new Date(today);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days);
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

export default function DateRangePicker({ onDateChange, initialRange }: DateRangePickerProps) {
  const defaultRange = getDefaultDateRange(30);
  const [startDate, setStartDate] = useState<Date>(
    initialRange ? new Date(initialRange.startDate) : new Date(defaultRange.startDate)
  );
  const [endDate, setEndDate] = useState<Date>(
    initialRange ? new Date(initialRange.endDate) : new Date(defaultRange.endDate)
  );

  useEffect(() => {
    if (initialRange) {
      setStartDate(new Date(initialRange.startDate));
      setEndDate(new Date(initialRange.endDate));
    }
  }, [initialRange]);

  const handleDateChange = (start: Date | null, end: Date | null) => {
    if (start && end) {
      const maxDate = new Date();
      const minDate = new Date();
      minDate.setDate(minDate.getDate() - 90);

      // Enforce 90-day limit
      if (end > maxDate) {
        end = maxDate;
      }
      if (start < minDate) {
        start = minDate;
      }
      if (end < start) {
        end = start;
      }

      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 90) {
        start = new Date(end);
        start.setDate(start.getDate() - 90);
      }

      setStartDate(start);
      setEndDate(end);

      const range: DateRange = {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
      onDateChange(range);
    }
  };

  const setQuickRange = (days: number) => {
    // Calculate from TODAY backwards
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const end = new Date(today);
    const start = new Date(today);
    start.setDate(start.getDate() - days);
    
    // Ensure we don't go beyond 90 days
    const maxDaysBack = 90;
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() - maxDaysBack);
    
    if (start < minDate) {
      start.setTime(minDate.getTime());
    }
    
    handleDateChange(start, end);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <label className="text-sm font-medium text-gray-300">Start Date:</label>
        <DatePicker
          selected={startDate}
          onChange={(date) => handleDateChange(date, endDate)}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          maxDate={endDate}
          minDate={new Date(new Date().setDate(new Date().getDate() - 90))}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          dateFormat="yyyy-MM-dd"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <label className="text-sm font-medium text-gray-300">End Date:</label>
        <DatePicker
          selected={endDate}
          onChange={(date) => handleDateChange(startDate, date)}
          selectsEnd
          startDate={startDate}
          endDate={endDate}
          minDate={startDate}
          maxDate={new Date()}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          dateFormat="yyyy-MM-dd"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setQuickRange(7)}
          className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
        >
          Last 7 days
        </button>
        <button
          onClick={() => setQuickRange(30)}
          className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
        >
          Last 30 days
        </button>
        <button
          onClick={() => setQuickRange(90)}
          className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
        >
          Last 90 days
        </button>
      </div>
    </div>
  );
}

