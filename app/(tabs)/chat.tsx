import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ref, push, onValue, query, limitToLast } from 'firebase/database';
import { db, useApp } from '@/context/AppContext';
import Colors from '@/constants/colors';

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: number;
  role?: string;
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <Animated.View
      entering={FadeInUp.springify().damping(20)}
      style={[styles.bubbleWrapper, isOwn && styles.bubbleWrapperOwn]}
    >
      {!isOwn && (
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarText}>{message.user.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {!isOwn && (
          <Text style={styles.bubbleUser}>
            {message.user}
            {message.role === 'manager' && (
              <Text style={styles.bubbleUserManager}> · рук</Text>
            )}
          </Text>
        )}
        <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
          {message.text}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, isOnline } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const lastSentRef = useRef(0);
  const inputRef = useRef<TextInput>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    if (!currentUser) return;
    const q = query(ref(db, 'chat'), limitToLast(100));
    const unsub = onValue(q, (snap) => {
      const list: Message[] = [];
      snap.forEach((child) => {
        list.push({ id: child.key!, ...(child.val() as Omit<Message, 'id'>) });
      });
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setMessages(list);
    });
    return () => unsub();
  }, [currentUser]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !currentUser) return;

    const now = Date.now();
    if (now - lastSentRef.current < 1000) return;
    lastSentRef.current = now;

    setText('');
    setSending(true);
    try {
      await push(ref(db, 'chat'), {
        user: currentUser.name,
        role: currentUser.role,
        text: trimmed,
        timestamp: Date.now(),
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSending(false);
    inputRef.current?.focus();
  };

  return (
    <View style={[styles.container, Platform.OS === 'web' && { paddingBottom: 84 }]}>
      <LinearGradient
        colors={[Colors.background, Colors.surface]}
        style={[styles.header, { paddingTop: (Platform.OS === 'web' ? 67 : insets.top) + 12 }]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.screenTitle}>Чат</Text>
          <View style={[styles.onlineDot, { backgroundColor: isOnline ? Colors.success : Colors.error }]} />
          <Text style={styles.onlineText}>{isOnline ? 'онлайн' : 'офлайн'}</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwn={item.user === currentUser?.name}
            />
          )}
          inverted
          contentContainerStyle={styles.messagesList}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyChatText}>Сообщений нет</Text>
              <Text style={styles.emptyChatSub}>Начните общение</Text>
            </View>
          }
        />

        <View style={[styles.inputBar, { paddingBottom: bottomPad + 8 }]}>
          <TextInput
            ref={inputRef}
            style={styles.chatInput}
            value={text}
            onChangeText={setText}
            placeholder="Сообщение..."
            placeholderTextColor={Colors.textMuted}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            multiline
          />
          <Pressable
            onPress={handleSend}
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            disabled={!text.trim() || sending}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTitle: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 28,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
    gap: 8,
  },
  bubbleWrapperOwn: {
    flexDirection: 'row-reverse',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 12,
    color: Colors.text,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 3,
  },
  bubbleOther: {
    backgroundColor: Colors.card,
    borderBottomLeftRadius: 4,
  },
  bubbleOwn: {
    backgroundColor: Colors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleUser: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 11,
    color: Colors.textSecondary,
  },
  bubbleUserManager: {
    fontFamily: 'Rubik_400Regular',
    color: Colors.success,
  },
  bubbleText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 15,
    color: Colors.text,
    lineHeight: 21,
  },
  bubbleTextOwn: {
    color: '#fff',
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
    transform: [{ scaleY: -1 }],
  },
  emptyChatText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 16,
    color: Colors.textMuted,
  },
  emptyChatSub: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  chatInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: Colors.card,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: 'Rubik_400Regular',
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
