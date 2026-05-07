import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder(hour: number): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('daily-reminder').catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: 'daily-reminder',
    content: {
      title: '오름달',
      body: '오늘 매매 전에 잠깐 체크해볼까요?',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('daily-reminder').catch(() => {});
}

// weekday: 1=일, 2=월, 3=화, 4=수, 5=목, 6=금, 7=토
export async function scheduleWeeklyReport(weekday: number, hour: number): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('weekly-report').catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: 'weekly-report',
    content: {
      title: '오름달 주간 리포트',
      body: '지난주 나의 투자 심리 패턴이 정리됐어요.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour,
      minute: 0,
    },
  });
}

export async function cancelWeeklyReport(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('weekly-report').catch(() => {});
}

export async function scheduleFollowUp(stockName: string, direction: 'buy' | 'sell'): Promise<void> {
  const dirText = direction === 'buy' ? '매수' : '매도';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '오름달',
      body: `${stockName} ${dirText}, 결국 어떻게 하셨나요?`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 8 * 3600,
    },
  });
}
