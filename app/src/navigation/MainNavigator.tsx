import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { MainStackParamList, MainTabParamList } from '../types';
import { Colors } from '../constants/colors';

import HomeScreen from '../screens/home/HomeScreen';
import RecordsScreen from '../screens/records/RecordsScreen';
import ReportScreen from '../screens/report/ReportScreen';
import MyPageScreen from '../screens/mypage/MyPageScreen';
import CheckChatScreen from '../screens/check/CheckChatScreen';
import RecordDetailScreen from '../screens/records/RecordDetailScreen';
import PostTradeScreen from '../screens/records/PostTradeScreen';
import SignUpScreen from '../screens/onboarding/SignUpScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Home: '○', Records: '≡', Report: '◫', My: '◯',
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopWidth: 0.5,
          borderTopColor: Colors.border,
          paddingBottom: 6,
          height: 58,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500', letterSpacing: 0.5 },
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 16, color }}>{TAB_ICONS[route.name] ?? '·'}</Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: '홈' }} />
      <Tab.Screen name="Records" component={RecordsScreen} options={{ tabBarLabel: '기록' }} />
      <Tab.Screen name="Report" component={ReportScreen} options={{ tabBarLabel: '리포트' }} />
      <Tab.Screen name="My" component={MyPageScreen} options={{ tabBarLabel: '마이' }} />
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen
        name="CheckChat"
        component={CheckChatScreen}
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="RecordDetail"
        component={RecordDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PostTrade"
        component={PostTradeScreen}
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}
