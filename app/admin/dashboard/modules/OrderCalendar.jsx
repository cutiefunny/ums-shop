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
  // 각 날짜별 주문 건수를 저장할 상태 추가
  const [ordersByDay, setOrdersByDay] = useState({});

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
      setOrdersByDay({}); // 초기화
      return;
    }

    const today = moment().startOf('day');
    const selectedMoment = moment(selectedDate).startOf('day');
    // D-7 오더를 위해 오늘부터 7일 후까지의 범위를 설정
    const sevenDaysLater = moment().add(7, 'days').endOf('day'); // 7일 후의 끝까지 포함

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

      // 배송일이 오늘부터 7일 후까지의 범위에 포함되는지 확인
      return deliveryDate && deliveryDate.isSameOrAfter(today, 'day') && deliveryDate.isSameOrBefore(sevenDaysLater, 'day');
    });

    // 월별 주문 건수를 계산
    const currentMonthOrders = allOrders.filter(order => {
      const orderDate = moment(order.date);
      return orderDate.month() === currentMonth && orderDate.year() === currentYear;
    });

    const counts = currentMonthOrders.reduce((acc, order) => {
      const day = moment(order.date).date();
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    setSelectedDateOrders(filteredSelectedDateOrders);
    setD7Orders(filteredD7Orders);
    setOrdersByDay(counts); // 상태 업데이트

  }, [allOrders, selectedDate, currentMonth, currentYear]); // currentMonth, currentYear 의존성 추가

  // 컴포넌트 마운트 시 모든 주문 데이터 가져오기
  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  // allOrders 또는 selectedDate, currentMonth, currentYear가 변경될 때마다 주문 필터링
  useEffect(() => {
    filterAndSetOrders();
  }, [allOrders, selectedDate, currentMonth, currentYear, filterAndSetOrders]);


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
    <div style={{ display: 'flex', flexDirection: 'row', gap: '20px' }}>
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
                position: 'relative', // 주문 건수 배지를 위해 relative 설정
                minHeight: '60px', // 날짜와 주문 건수가 들어갈 최소 높이
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'center',
              }}
              onClick={() => handleDayClick(day)}
            >
              {day}
              {day && ordersByDay[day] > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '5px',
                    right: '5px',
                    backgroundColor: '#FBC926',
                    color: 'white',
                    borderRadius: '50%',
                    padding: '2px 6px',
                    fontSize: '0.75em',
                    fontWeight: 'bold',
                  }}
                >
                  {ordersByDay[day]}
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>
      <OrderInfoSection
        selectedDate={selectedDate}
        selectedDateOrders={selectedDateOrders}
        d7Orders={d7Orders}
        loading={loadingOrders}
        error={errorOrders}
      />
    </div>
    </>
  );
}