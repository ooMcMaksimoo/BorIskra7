import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useApp, UserRecord, ADMIN_PIN } from '@/context/AppContext';
import Colors from '@/constants/colors';

function RoleBadge({ role }: { role: 'welder' | 'manager' }) {
  const isManager = role === 'manager';
  return (
    <View style={[styles.badge, isManager ? styles.badgeManager : styles.badgeWelder]}>
      <Text style={[styles.badgeText, isManager ? styles.badgeTextManager : styles.badgeTextWelder]}>
        {isManager ? 'Руководитель' : 'Сварщик'}
      </Text>
    </View>
  );
}

function UserItem({
  user,
  onDelete,
  onEditPin,
  canManage,
}: {
  user: UserRecord;
  onDelete: () => void;
  onEditPin: () => void;
  canManage: boolean;
}) {
  return (
    <Animated.View entering={FadeInRight.springify()} style={styles.userItem}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>{user.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
        <RoleBadge role={user.role} />
      </View>
      {canManage && (
        <View style={styles.userActions}>
          <Pressable onPress={onEditPin} hitSlop={8} style={styles.actionBtn}>
            <Ionicons name="key-outline" size={16} color={Colors.accent} />
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8} style={[styles.actionBtn, styles.deleteBtn]}>
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

type FormMode = 'add' | 'editPin';

export default function UsersScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, users, addUser, removeUser, updateUserPin } = useApp();
  const isManager = currentUser?.role === 'manager';

  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<FormMode>('add');
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  const [formName, setFormName] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formPin2, setFormPin2] = useState('');
  const [formRole, setFormRole] = useState<'welder' | 'manager'>('welder');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const openAdd = () => {
    setMode('add');
    setFormName('');
    setFormPin('');
    setFormPin2('');
    setFormRole('welder');
    setFormError('');
    setEditingUser(null);
    setModalVisible(true);
  };

  const openEditPin = (user: UserRecord) => {
    setMode('editPin');
    setEditingUser(user);
    setFormPin('');
    setFormPin2('');
    setFormError('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (mode === 'add') {
      const trimName = formName.trim();
      if (!trimName) {
        setFormError('Введите имя');
        return;
      }
      if (formPin.length < 4) {
        setFormError('ПИН должен содержать минимум 4 цифры');
        return;
      }
      if (formPin !== formPin2) {
        setFormError('ПИН-коды не совпадают');
        return;
      }
      if (formPin === ADMIN_PIN) {
        setFormError(`ПИН ${ADMIN_PIN} зарезервирован для администратора`);
        return;
      }
      const duplicate = users.find(
        (u) => u.name.toLowerCase() === trimName.toLowerCase()
      );
      if (duplicate) {
        setFormError('Пользователь с таким именем уже существует');
        return;
      }
      setSaving(true);
      try {
        await addUser(trimName, formRole, formPin);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setModalVisible(false);
      } catch (e) {
        setFormError('Ошибка при сохранении: ' + String(e));
      }
      setSaving(false);
    } else if (mode === 'editPin' && editingUser) {
      if (formPin.length < 4) {
        setFormError('ПИН должен содержать минимум 4 цифры');
        return;
      }
      if (formPin !== formPin2) {
        setFormError('ПИН-коды не совпадают');
        return;
      }
      if (formPin === ADMIN_PIN) {
        setFormError(`ПИН ${ADMIN_PIN} зарезервирован для администратора`);
        return;
      }
      setSaving(true);
      try {
        await updateUserPin(editingUser.id, formPin);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setModalVisible(false);
      } catch (e) {
        setFormError('Ошибка при сохранении: ' + String(e));
      }
      setSaving(false);
    }
  };

  const handleDelete = (user: UserRecord) => {
    Alert.alert(
      `Удалить "${user.name}"?`,
      'Пользователь не сможет войти в приложение.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeUser(user.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (e) {
              Alert.alert('Ошибка', String(e));
            }
          },
        },
      ]
    );
  };

  if (!isManager) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="lock-closed" size={48} color={Colors.textMuted} />
        <Text style={styles.accessDenied}>Только для руководителей</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <LinearGradient
              colors={[Colors.background, Colors.surface]}
              style={[styles.header, { paddingTop: topPad + 12 }]}
            >
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.screenTitle}>Пользователи</Text>
                  <Text style={styles.screenSubtitle}>{users.length} зарегистрировано</Text>
                </View>
                <Pressable onPress={openAdd} style={styles.addHeaderBtn}>
                  <Ionicons name="person-add-outline" size={20} color={Colors.accent} />
                </Pressable>
              </View>
            </LinearGradient>

            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              style={styles.infoBox}
            >
              <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.infoText}>
                Добавьте сотрудников с индивидуальными ПИН-кодами. Администратор всегда может войти с ПИН{' '}
                <Text style={styles.infoPin}>{ADMIN_PIN}</Text>.
              </Text>
            </Animated.View>

            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Список</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Нет пользователей</Text>
            <Text style={styles.emptySubText}>
              Добавьте сотрудников с их ПИН-кодами
            </Text>
            <Pressable onPress={openAdd} style={styles.emptyAddBtn}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyAddBtnText}>Добавить первого</Text>
            </Pressable>
          </View>
        }
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
            <UserItem
              user={item}
              canManage={isManager}
              onDelete={() => handleDelete(item)}
              onEditPin={() => openEditPin(item)}
            />
          </Animated.View>
        )}
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Ionicons
                name={mode === 'add' ? 'person-add' : 'key'}
                size={22}
                color={Colors.accent}
              />
              <Text style={styles.modalTitle}>
                {mode === 'add' ? 'Новый пользователь' : `Сменить ПИН — ${editingUser?.name}`}
              </Text>
            </View>

            {mode === 'add' && (
              <>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Имя</Text>
                  <View style={styles.modalInputWrap}>
                    <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.modalInput}
                      value={formName}
                      onChangeText={(v) => { setFormName(v); setFormError(''); }}
                      placeholder="Имя сотрудника"
                      placeholderTextColor={Colors.textMuted}
                      autoCapitalize="words"
                      autoFocus
                    />
                  </View>
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Роль</Text>
                  <View style={styles.roleRow}>
                    <Pressable
                      style={[styles.roleBtn, formRole === 'welder' && styles.roleBtnActive]}
                      onPress={() => setFormRole('welder')}
                    >
                      <Ionicons name="construct-outline" size={16} color={formRole === 'welder' ? '#fff' : Colors.textSecondary} />
                      <Text style={[styles.roleBtnText, formRole === 'welder' && styles.roleBtnTextActive]}>
                        Сварщик
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.roleBtn, styles.roleBtnManager, formRole === 'manager' && styles.roleBtnManagerActive]}
                      onPress={() => setFormRole('manager')}
                    >
                      <Ionicons name="briefcase-outline" size={16} color={formRole === 'manager' ? '#fff' : Colors.textSecondary} />
                      <Text style={[styles.roleBtnText, formRole === 'manager' && styles.roleBtnTextActive]}>
                        Руководитель
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </>
            )}

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>ПИН-код</Text>
              <View style={styles.modalInputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.modalInput}
                  value={formPin}
                  onChangeText={(v) => { setFormPin(v); setFormError(''); }}
                  placeholder="Минимум 4 цифры"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  autoFocus={mode === 'editPin'}
                />
              </View>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Повторите ПИН</Text>
              <View style={styles.modalInputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.modalInput}
                  value={formPin2}
                  onChangeText={(v) => { setFormPin2(v); setFormError(''); }}
                  placeholder="Повторите ПИН"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
              </View>
            </View>

            {!!formError && (
              <View style={styles.formErrorBox}>
                <Ionicons name="alert-circle" size={14} color={Colors.error} />
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Отмена</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnConfirm, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>Сохранить</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  accessDenied: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 16,
    color: Colors.textMuted,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 28,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  addHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(249,115,22,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: {
    flex: 1,
    fontFamily: 'Rubik_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  infoPin: {
    fontFamily: 'Rubik_700Bold',
    color: Colors.accent,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 16,
    color: Colors.text,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(249,115,22,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 16,
    color: Colors.accent,
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeWelder: {
    backgroundColor: 'rgba(249,115,22,0.12)',
  },
  badgeManager: {
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  badgeText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 11,
  },
  badgeTextWelder: {
    color: Colors.accent,
  },
  badgeTextManager: {
    color: Colors.success,
  },
  userActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(249,115,22,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  emptyState: {
    paddingTop: 48,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 16,
    color: Colors.textMuted,
  },
  emptySubText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyAddBtnText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 18,
    color: Colors.text,
    flex: 1,
  },
  modalField: {
    gap: 6,
  },
  modalLabel: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginLeft: 2,
  },
  modalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 48,
  },
  modalInput: {
    flex: 1,
    fontFamily: 'Rubik_400Regular',
    fontSize: 15,
    color: Colors.text,
    height: '100%',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  roleBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  roleBtnManager: {},
  roleBtnManagerActive: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  roleBtnText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  roleBtnTextActive: {
    color: '#fff',
  },
  formErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formErrorText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 13,
    color: Colors.error,
    flex: 1,
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
    backgroundColor: Colors.accent,
  },
  modalBtnConfirmText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 15,
    color: '#fff',
  },
});
