// components/DatePickerModal.jsx
'use client';

import React, { useState, useEffect } from 'react';
import moment from 'moment';
import styles from './datePickerModal.module.css';

const MonthView = ({ currentDate, onMonthSelect }) => {
    const months = moment.monthsShort();
    return (
        <div className={styles.monthGrid}>
            {months.map((month, index) => (
                <button key={month} onClick={() => onMonthSelect(index)} className={styles.monthButton}>
                    {month}
                </button>
            ))}
        </div>
    );
};

const DayView = ({ currentDate, selectedDate, onDaySelect, onNavChange, onDateChange }) => {
    const firstDayOfMonth = currentDate.clone().startOf('month');
    const lastDayOfMonth = currentDate.clone().endOf('month');
    const startDayOfWeek = firstDayOfMonth.day(); // 0 (Sun) to 6 (Sat)
    const today = moment();
    
    const days = [];
    // Add empty cells for days before the start of the month
    for (let i = 0; i < startDayOfWeek; i++) {
        days.push(<div key={`empty-start-${i}`} className={styles.dayCell}></div>);
    }
    // Add day cells for the current month
    for (let day = 1; day <= lastDayOfMonth.date(); day++) {
        const date = firstDayOfMonth.clone().date(day);
        
        const isSelected = date.isSame(selectedDate, 'day');
        const isToday = date.isSame(today, 'day');
        
        const buttonClasses = [
            styles.dayButton,
            isSelected ? styles.selected : '',
            isToday ? styles.today : ''
        ].join(' ');

        days.push(
            <button key={day} onClick={() => onDaySelect(date)} className={buttonClasses}>
                {day}
            </button>
        );
    }
    
    const handleMonthChange = (e) => {
        const newMonth = parseInt(e.target.value, 10);
        onDateChange(currentDate.clone().month(newMonth));
    };

    const handleYearChange = (e) => {
        const newYear = parseInt(e.target.value, 10);
        onDateChange(currentDate.clone().year(newYear));
    };
    
    const years = Array.from({ length: 21 }, (_, i) => moment().year() - 10 + i);

    return (
        <div>
            {/* [수정됨] 헤더 UI 변경 */}
            <div className={styles.calendarHeader}>
                {/* <button onClick={() => onNavChange(-1)} className={styles.navButton}>&lt;</button> */}
                <div className={styles.selectWrapper}>
                    <select 
                        value={currentDate.month()}
                        onChange={handleMonthChange}
                        className={styles.dateSelect}
                    >
                        {moment.months().map((month, index) => (
                            <option key={month} value={index}>{month}</option>
                        ))}
                    </select>
                    <select
                        value={currentDate.year()}
                        onChange={handleYearChange}
                        className={styles.dateSelect}
                    >
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                {/* <button onClick={() => onNavChange(1)} className={styles.navButton}>&gt;</button> */}
            </div>
            <div className={styles.weekdays}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day}>{day}</div>)}
            </div>
            <div className={styles.dayGrid}>{days}</div>
        </div>
    );
};


const DatePickerModal = ({ isOpen, onClose, onConfirm, initialDate }) => {
    const [view, setView] = useState('month'); // 'month' or 'day'
    const [currentDate, setCurrentDate] = useState(initialDate ? moment(initialDate) : moment());
    const [selectedDate, setSelectedDate] = useState(initialDate ? moment(initialDate) : moment());

    useEffect(() => {
        if (isOpen) {
            const initial = initialDate ? moment(initialDate) : moment();
            setCurrentDate(initial);
            setSelectedDate(initial);
            setView('month'); // Reset to month view every time it opens
        }
    }, [isOpen, initialDate]);

    if (!isOpen) return null;

    const handleMonthSelect = (monthIndex) => {
        const newDate = currentDate.clone().month(monthIndex);
        setCurrentDate(newDate);
        setSelectedDate(newDate); // Update selectedDate as well
        setView('day');
    };
    
    const handleDaySelect = (date) => {
        onConfirm(date.format('YYYY-MM-DD'));
        onClose(); // Close modal after day selection
    };

    const handleNavChange = (amount) => {
        setCurrentDate(currentDate.clone().add(amount, 'months'));
    };

    const handleDateChange = (newDate) => {
        setCurrentDate(newDate);
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* <div className={styles.header}>
                    <h2>{view === 'month' ? `Select Month - ${currentDate.format('YYYY')}` : 'Select Date'}</h2>
                    <button onClick={onClose} className={styles.closeButton}>×</button>
                </div> */}
                <div className={styles.content}>
                    {view === 'month' ? (
                        <MonthView currentDate={currentDate} onMonthSelect={handleMonthSelect} />
                    ) : (
                        <DayView 
                            currentDate={currentDate} 
                            selectedDate={selectedDate}
                            onDaySelect={handleDaySelect} 
                            onNavChange={handleNavChange}
                            onDateChange={handleDateChange}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default DatePickerModal;