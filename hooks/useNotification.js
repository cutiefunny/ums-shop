// hooks/useNotification.js
import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // 사용자 정보(user.seq)를 위해 AuthContext 필요
import { useModal } from '@/contexts/ModalContext'; // 알림 메시지 표시를 위해 ModalContext 필요

/**
 * 사용자에게 알림을 추가하는 커스텀 훅.
 * user-management 테이블의 'noti' 배열에 새 알림을 추가합니다.
 * 업데이트 될 notificationData의 category와 user-management의 notificationSettings의 값들을 확인하여
 * 해당 category의 notification 설정값이 true인 경우에만 noti에 저장을 실행한다.
 *
 * @returns {function(object): Promise<void>} addNotification - 알림을 추가하는 비동기 함수
 */
export const useNotification = () => {
    const { user } = useAuth();
    const { showModal } = useModal();

    const addNotification = useCallback(async (notificationData) => {
        if (!user?.seq) {
            console.error("No user sequence found for adding notification.");
            showModal("Could not find user information to add the notification.");
            return;
        }

        try {
            // 현재 사용자 정보를 가져와서 기존 noti 배열과 notifications를 확인
            const currentUserResponse = await fetch(`/api/users/${user.seq}`);
            if (!currentUserResponse.ok) {
                throw new Error(`Failed to fetch current user data for noti update. Status: ${currentUserResponse.status}`);
            }
            const currentUserData = await currentUserResponse.json();
            
            const userNotificationSettings = currentUserData.notifications || {};
            const notificationCategory = notificationData.category;

            // 해당 카테고리의 알림 설정이 false인 경우 알림을 저장하지 않고 종료
            // 설정값이 없거나 true인 경우에만 진행 (기본적으로 알림 허용)
            if (userNotificationSettings[notificationCategory] === false) {
                console.log(`Notification for category '${notificationCategory}' is disabled by user settings. Skipping.`);
                return; // 알림 저장 중단
            }

            // 기존 noti 배열에 새 알림 추가 (새로운 알림이 가장 최근에 오도록)
            // timestamp는 서버에서 생성하는 것이 더 정확할 수 있지만, 현재 로직을 따릅니다.
            const newNotificationItem = { 
                ...notificationData, 
                timestamp: new Date().toISOString(), 
                read: false 
            };
            const updatedNoti = [
                ...(currentUserData.noti || []), 
                newNotificationItem
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
            console.log("Notification added successfully for user:", user.email, "Category:", notificationCategory);

        } catch (error) {
            console.error("Error adding notification:", error);
            showModal(`Error adding notification: ${error.message}`);
        }
    }, [user, showModal]);

    return addNotification;
};