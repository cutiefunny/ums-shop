// hooks/useNotification.js
import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // 사용자 정보(user.seq)를 위해 AuthContext 필요
import { useModal } from '@/contexts/ModalContext'; // 알림 메시지 표시를 위해 ModalContext 필요

/**
 * 사용자에게 알림을 추가하는 커스텀 훅.
 * user-management 테이블의 'noti' 배열에 새 알림을 추가합니다.
 *
 * @returns {function(object): Promise<void>} addNotification - 알림을 추가하는 비동기 함수
 */
export const useNotification = () => {
    const { user } = useAuth();
    const { showModal } = useModal();

    const addNotification = useCallback(async (notificationData) => {
        if (!user?.seq) {
            console.error("No user sequence found for adding notification.");
            showModal("알림을 추가할 사용자 정보를 찾을 수 없습니다.");
            return;
        }

        try {
            // 현재 사용자 정보를 가져와서 기존 noti 배열을 확인
            const currentUserResponse = await fetch(`/api/users/${user.seq}`);
            if (!currentUserResponse.ok) {
                throw new Error(`Failed to fetch current user data for noti update. Status: ${currentUserResponse.status}`);
            }
            const currentUserData = await currentUserResponse.json();
            
            // 기존 noti 배열에 새 알림 추가 (새로운 알림이 가장 최근에 오도록)
            const updatedNoti = [
                ...(currentUserData.noti || []), 
                { ...notificationData, timestamp: new Date().toISOString(), read: false }
            ];

            // 업데이트된 noti 배열로 사용자 정보 업데이트
            const updateUserNotiResponse = await fetch(`/api/users/${user.seq}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ noti: updatedNoti }),
            });

            if (!updateUserNotiResponse.ok) {
                const errorData = await updateUserNotiResponse.json();
                throw new Error(errorData.message || 'Failed to update user noti.');
            }
            console.log("Notification added successfully for user:", user.email);

        } catch (error) {
            console.error("Error adding notification:", error);
            showModal(`알림 추가에 실패했습니다: ${error.message}`);
        }
    }, [user, showModal]);

    return addNotification;
};