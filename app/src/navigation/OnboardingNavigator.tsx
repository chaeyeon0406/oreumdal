import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../types';
import PersonalityTestScreen from '../screens/onboarding/PersonalityTestScreen';
import PersonalityResultScreen from '../screens/onboarding/PersonalityResultScreen';
import InvestmentPrinciplesScreen from '../screens/onboarding/InvestmentPrinciplesScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PersonalityTest" component={PersonalityTestScreen} />
      <Stack.Screen name="PersonalityResult" component={PersonalityResultScreen} />
      <Stack.Screen name="InvestmentPrinciples" component={InvestmentPrinciplesScreen} />
    </Stack.Navigator>
  );
}
