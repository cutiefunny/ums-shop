// app/admin/dashboard/modules/OrderCalendar.jsx
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import moment from 'moment';
import Card from '../../components/Card'; // 공통 Card 컴포넌트 임포트
import OrderInfoSection from './OrderInfoSection'; // OrderInfoSection 컴포넌트 임포트

export default function OrderCalendar() {
  const [currentMonth, setCurrentMonth] = useState(moment().month());
  const [currentYear, setCurrentYear] = useState(moment().year());
  // 초기 선택 날짜를 오늘 날짜로 설정
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));

  const [allOrders, setAllOrders] = useState([]);
  const [selectedDateOrders, setSelectedDateOrders] = useState([]);
  const [d7Orders, setD7Orders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [errorOrders, setErrorOrders] = useState(null);

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

  // API를 통해 모든 주문 데이터를 가져오는 함수
  const fetchAllOrders = useCallback(async () => {
    setLoadingOrders(true);
    setErrorOrders(null);
    try {
      const response = await fetch('/api/orders');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAllOrders(data || []);
    } catch (err) {
      console.error("Error fetching all orders:", err);
      setErrorOrders(`모든 주문 데이터를 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // 주문 데이터를 필터링하고 상태를 업데이트하는 함수
  const filterAndSetOrders = useCallback(() => {
    if (!allOrders.length) {
      setSelectedDateOrders([]);
      setD7Orders([]);
      return;
    }

    const today = moment().startOf('day');
    const selectedMoment = moment(selectedDate).startOf('day');
    const d7Moment = moment().add(7, 'days').startOf('day');

    const filteredSelectedDateOrders = allOrders.filter(order => {
      // order.date는 ISO 문자열 (YYYY-MM-DDTHH:mm:ss.sssZ)이라고 가정
      const orderDate = moment(order.date).startOf('day');
      return orderDate.isSame(selectedMoment, 'day');
    });

    const filteredD7Orders = allOrders.filter(order => {
      const estimatedDelivery = order.shippingDetails?.estimatedDelivery;
      const actualDelivery = order.shippingDetails?.actualDelivery;

      let deliveryDate = null;
      if (actualDelivery) {
        deliveryDate = moment(actualDelivery).startOf('day');
      } else if (estimatedDelivery) {
        deliveryDate = moment(estimatedDelivery).startOf('day');
      }

      return deliveryDate && deliveryDate.isSame(d7Moment, 'day');
    });

    setSelectedDateOrders(filteredSelectedDateOrders);
    setD7Orders(filteredD7Orders);

  }, [allOrders, selectedDate]);

  // 컴포넌트 마운트 시 모든 주문 데이터 가져오기
  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  // allOrders 또는 selectedDate가 변경될 때마다 주문 필터링
  useEffect(() => {
    filterAndSetOrders();
  }, [allOrders, selectedDate, filterAndSetOrders]);


  const goToPreviousMonth = () => {
    const prevMonthMoment = moment().year(currentYear).month(currentMonth).subtract(1, 'month');
    setCurrentMonth(prevMonthMoment.month());
    setCurrentYear(prevMonthMoment.year());
    // 월 변경 시 선택된 날짜 초기화 (선택 사항, 여기서는 유지)
    // setSelectedDate(prevMonthMoment.format('YYYY-MM-DD'));
  };

  const goToNextMonth = () => {
    const nextMonthMoment = moment().year(currentYear).month(currentMonth).add(1, 'month');
    setCurrentMonth(nextMonthMoment.month());
    setCurrentYear(nextMonthMoment.year());
    // 월 변경 시 선택된 날짜 초기화 (선택 사항, 여기서는 유지)
    // setSelectedDate(nextMonthMoment.format('YYYY-MM-DD'));
  };

  const isToday = (day) => {
    const today = moment();
    return (
      day === today.date() &&
      currentMonth === today.month() &&
      currentYear === today.year()
    );
  };

  const isSelected = (day) => {
    const selectedMoment = moment(selectedDate);
    return (
      day === selectedMoment.date() &&
      currentMonth === selectedMoment.month() &&
      currentYear === selectedMoment.year()
    );
  };

  const handleDayClick = (day) => {
    if (day) {
      const newSelectedDate = moment().year(currentYear).month(currentMonth).date(day).format('YYYY-MM-DD');
      setSelectedDate(newSelectedDate);
    }
  };

  return (
    <>
      <Card title="오더 캘린더" style={{ flexGrow: 1 }}>
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
              onClick={() => handleDayClick(day)}
            >
              {day}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
