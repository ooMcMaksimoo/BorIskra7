import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp, MANAGER_PIN } from '@/context/AppContext';
import Colors from '@/constants/colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function LoginButton({
  label,
  icon,
  color,
  onPress,
  delay = 0,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  delay?: number;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <Animated.View style={animStyle}>
        <Pressable
          onPressIn={() => {
            scale.value = withSpring(0.96);
          }}
          onPressOut={() => {
            scale.value = withSpring(1);
          }}
          onPress={onPress}
          style={[styles.loginBtn, { backgroundColor: color }]}
        >
          <Ionicons name={icon} size={22} color="#fff" />
          <Text style={styles.loginBtnText}>{label}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, login } = useApp();
  const [name, setName] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [loading, setLoading] = useState(false);
  const pinInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (currentUser) {
      router.replace('/(tabs)/records');
    }
  }, [currentUser]);

  useEffect(() => {
    AsyncStorage.getItem('boriskra_lastName').then((saved) => {
      if (saved) setName(saved);
    });
  }, []);

  const handleWelderLogin = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setLoading(true);
    await login(trimmed, 'welder');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)/records');
    setLoading(false);
  };

  const handleManagerPress = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setPin('');
    setPinError(false);
    setPinVisible(true);
    setTimeout(() => pinInputRef.current?.focus(), 300);
  };

  const handleVerifyPin = async () => {
    if (pin === MANAGER_PIN) {
      setPinVisible(false);
      setLoading(true);
      await login(name.trim(), 'manager');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/records');
      setLoading(false);
    } else {
      setPinError(true);
      setPin('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => setPinError(false), 1500);
    }
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad + 20 }]}>
      <LinearGradient
        colors={['#0B1120', '#162032', '#0B1120']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
        <View style={styles.sparkIcon}>
          <Ionicons name="flash" size={36} color={Colors.accent} />
        </View>
        <Text style={styles.appName}>БорИскра</Text>
        <Text style={styles.appSubtitle}>УЧЁТ СВАРКИ</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.form}>
        <Text style={styles.formLabel}>Ваше имя</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Введите имя"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleWelderLogin}
          />
        </View>
      </Animated.View>

      <View style={styles.buttons}>
        <LoginButton
          label="Сварщик"
          icon="construct"
          color={Colors.accent}
          onPress={handleWelderLogin}
          delay={300}
        />
        <LoginButton
          label="Руководитель"
          icon="briefcase"
          color={Colors.success}
          onPress={handleManagerPress}
          delay={400}
        />
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      )}

      <Modal
        visible={pinVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPinVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPinVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Ionicons name="lock-closed" size={24} color={Colors.accent} />
              <Text style={styles.modalTitle}>Код руководителя</Text>
            </View>

            <TextInput
              ref={pinInputRef}
              style={[styles.pinInput, pinError && styles.pinInputError]}
              value={pin}
              onChangeText={setPin}
              placeholder="••••"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              onSubmitEditing={handleVerifyPin}
              returnKeyType="done"
            />

            {pinError && (
              <Text style={styles.pinErrorText}>Неверный код</Text>
            )}

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setPinVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Отмена</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleVerifyPin}
              >
                <Text style={styles.modalBtnConfirmText}>Войти</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Animated.View entering={FadeIn.delay(600)} style={styles.footer}>
        <Text style={styles.footerText}>сделано с огнём</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 32,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  sparkIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(249,115,22,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.2)',
  },
  appName: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 36,
    color: Colors.accent,
    letterSpacing: -1,
  },
  appSubtitle: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  form: {
    gap: 8,
  },
  formLabel: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Rubik_400Regular',
    fontSize: 16,
    color: Colors.text,
    height: '100%',
  },
  buttons: {
    gap: 12,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginBtnText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,17,32,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 20,
    color: Colors.text,
  },
  pinInput: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 28,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 12,
    height: 64,
    paddingHorizontal: 20,
  },
  pinInputError: {
    borderColor: Colors.error,
  },
  pinErrorText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  modalBtnCancelText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  modalBtnConfirm: {
    backgroundColor: Colors.success,
  },
  modalBtnConfirmText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 15,
    color: '#fff',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
});
