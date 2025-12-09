'use client';

import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { DateRange } from '@/types';

interface DateRangePickerProps {
  onDateChange: (range: DateRange) => void;
  initialRange?: DateRange;
}

const pakistanDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Karachi',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getPakistanDateString(baseDate: Date = new Date()): string {
  // Extract year-month-day in Pakistan time without re-parsing locale strings
  const parts = pakistanDateFormatter.formatToParts(baseDate);
  const year = parts.find(p => p.type === 'year')?.value ?? '1970';
  const month = parts.find(p => p.type === 'month')?.value ?? '01';
  const day = parts.find(p => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

function parsePakistanDate(dateString: string): Date {
  // Parse a YYYY-MM-DD string as Pakistan time
  return new Date(`${dateString}T00:00:00+05:00`);
}

function formatPakistanDate(date: Date): string {
  return pakistanDateFormatter.format(date);
}

function getPakistanDateAtStartOfDay(): Date {
  const todayStr = getPakistanDateString();
  // Create a Date anchored to Pakistan time to avoid timezone drift
  return parsePakistanDate(todayStr);
}

// FIXED START DATE: September 15, 2025 (when data collection began)
const FIXED_START_DATE = '2025-09-15';

// Helper to calculate date range from today backwards
function getDefaultDateRange(days: number): DateRange {
  const today = getPakistanDateAtStartOfDay();
  // Set to end of today (23:59:59) to include today's data
  today.setHours(23, 59, 59, 999);
  
  const endDate = new Date(today);
  const startDate = new Date(today);
  // Subtract (days - 1) to get exactly 'days' calendar days including today
  // Example: "Last 7 days" = today + previous 6 days = 7 total days
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);
  
  return {
    startDate: formatPakistanDate(startDate),
    endDate: formatPakistanDate(endDate),
  };
}

export default function DateRangePicker({ onDateChange, initialRange }: DateRangePickerProps) {
  const defaultRange = getDefaultDateRange(30);
  const [startDate, setStartDate] = useState<Date>(
    initialRange ? parsePakistanDate(initialRange.startDate) : parsePakistanDate(defaultRange.startDate)
  );
  const [endDate, setEndDate] = useState<Date>(
    initialRange ? parsePakistanDate(initialRange.endDate) : parsePakistanDate(defaultRange.endDate)
  );

  useEffect(() => {
    if (initialRange) {
      setStartDate(parsePakistanDate(initialRange.startDate));
      setEndDate(parsePakistanDate(initialRange.endDate));
    }
  }, [initialRange]);

  const handleDateChange = (start: Date | null, end: Date | null) => {
    if (start && end) {
      const maxDate = getPakistanDateAtStartOfDay();
      maxDate.setHours(23, 59, 59, 999); // Include today's full day
      
      const minDate = new Date(FIXED_START_DATE); // Fixed start: Sept 15, 2024

      // Enforce date limits
      if (end > maxDate) {
        end = maxDate;
      }
      if (start < minDate) {
        start = minDate;
      }
      if (end < start) {
        end = start;
      }

      setStartDate(start);
      setEndDate(end);

      const range: DateRange = {
        startDate: formatPakistanDate(start),
        endDate: formatPakistanDate(end),
      };
      onDateChange(range);
    }
  };

  const setQuickRange = (days: number) => {
    // Calculate from TODAY backwards
    const today = getPakistanDateAtStartOfDay();
    today.setHours(23, 59, 59, 999); // Include today's full day
    
    const end = new Date(today);
    const start = new Date(today);
    // Subtract (days - 1) to get exactly 'days' calendar days including today
    // Example: "Last 7 days" = today + previous 6 days = 7 total days
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    
    // Ensure we don't go before fixed start date
    const minDate = new Date(FIXED_START_DATE);
    
    if (start < minDate) {
      start.setTime(minDate.getTime());
    }
    
    handleDateChange(start, end);
  };

  const setAllTimeRange = () => {
    // Set to fixed start date (Sept 15, 2024) to today
    const today = getPakistanDateAtStartOfDay();
    today.setHours(23, 59, 59, 999);
    
    const start = new Date(FIXED_START_DATE);
    start.setHours(0, 0, 0, 0);
    
    handleDateChange(start, today);
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
          minDate={new Date(FIXED_START_DATE)}
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
          maxDate={new Date(`${getPakistanDateString()}T23:59:59.999+05:00`)}
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
        <button
          onClick={setAllTimeRange}
          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-medium"
        >
          All Time
        </button>
      </div>
    </div>
  );
}