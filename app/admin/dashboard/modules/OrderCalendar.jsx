// app/admin/dashboard/modules/OrderCalendar.jsx
'use client';
import React, { useState } from 'react';
import moment from 'moment';
import Card from '../../components/Card'; // 공통 Card 컴포넌트 임포트

export default function OrderCalendar() {
  const [currentMonth, setCurrentMonth] = useState(moment().month());
  const [currentYear, setCurrentYear] = useState(moment().year());
  const [selectedDate, setSelectedDate] = useState(moment().date());

  const firstDayOfMonth = moment().year(currentYear).month(currentMonth).startOf('month');
  const daysInMonth = moment().year(currentYear).month(currentMonth).daysInMonth();
  const startDayOfWeek = firstDayOfMonth.day();

  const calendarDays = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const isToday = (day) => {
    const today = moment();
    return (
      day === today.date() &&
      currentMonth === today.month() &&
      currentYear === today.year()
    );
  };

  const isSelected = (day) => day === selectedDate;

  return (
    <Card title="오더 캘린더" style={{ flexGrow: 1 }}> {/* style prop을 통해 flexGrow 전달 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <button onClick={goToPreviousMonth} style={{ padding: '8px 12px', cursor: 'pointer' }}>&lt;</button>
        <span>{currentYear}년 {currentMonth + 1}월</span>
        <button onClick={goToNextMonth} style={{ padding: '8px 12px', cursor: 'pointer' }}>&gt;</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center' }}>
        {['일', '월', '화', '수', '목', '금', '토'].map((dayName) => (
          <div key={dayName} style={{ fontWeight: 'bold', padding: '8px', borderBottom: '1px solid #eee' }}>{dayName}</div>
        ))}
        {calendarDays.map((day, index) => (
          <div
            key={index}
            style={{
              padding: '10px',
              border: '1px solid #eee',
              borderRadius: '5px',
              backgroundColor: isSelected(day) ? '#FFDCDC' : (isToday(day) ? '#E0E0E0' : 'white'),
              cursor: day ? 'pointer' : 'default',
              opacity: day ? 1 : 0.5,
              fontWeight: isSelected(day) || isToday(day) ? 'bold' : 'normal',
            }}
            onClick={() => day && setSelectedDate(day)}
          >
            {day}
          </div>
        ))}
      </div>
    </Card>
  );
}