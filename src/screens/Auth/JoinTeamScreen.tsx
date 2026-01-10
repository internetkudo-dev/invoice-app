import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button, Card, LoadingOverlay } from '../../components/common';
import { supabase } from '../../api/supabase';
import { ShieldCheck, ArrowRight, UserPlus, Mail, Lock, User } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';

export function JoinTeamScreen({ navigation }: any) {
    const { isDark, primaryColor } = useTheme();
    const { signUp } = useAuth();

    const [token, setToken] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const [verifiedCompany, setVerifiedCompany] = useState<{ id: string, name: string } | null>(null);

    const checkToken = async () => {
        if (!token.trim()) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('verify_invite_token', { token_input: token.trim() });
            if (error) throw error;

            if (data && data.length > 0) {
                setVerifiedCompany(data[0]);
            } else {
                Alert.alert('Invalid Token', 'Could not find a company with this invite token.');
                setVerifiedCompany(null);
            }
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!verifiedCompany) return;
        if (!firstName || !lastName || !email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            // 1. Sign Up the user with Invite Token in metadata
            // The database trigger 'process_new_user_invite' will handle the joining process automatically.
            const { error: signUpError } = await signUp(email, password, {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    invite_token: token.trim(), // Trigger looks for this
                    phone: '',
                    tax_id: ''
                }
            });

            if (signUpError) throw signUpError;

            Alert.alert(
                'Request Sent',
                `Your request to join ${verifiedCompany.name} has been sent. Please wait for an admin to approve your account.`,
                [{
                    text: 'OK', onPress: () => {
                        // Start navigation to Dashboard (blocked by AppNavigator until approved)
                        // Or ideally reset stack.
                        // AuthContext update will trigger AppNavigator switch.
                    }
                }]
            );

        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const inputBg = isDark ? '#0f172a' : '#f1f5f9';
    const borderColor = isDark ? '#334155' : '#e2e8f0';

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: bgColor }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <LoadingOverlay visible={loading} text={verifiedCompany ? "Joining..." : "Verifying Token..."} />

                <View style={styles.iconContainer}>
                    <ShieldCheck size={64} color={primaryColor} />
                </View>

                {!verifiedCompany ? (
                    <>
                        <Text style={[styles.title, { color: textColor }]}>Join Your Team</Text>
                        <Text style={[styles.subtitle, { color: mutedColor }]}>
                            Enter the invite token to verify your company.
                        </Text>

                        <View style={[styles.form, { backgroundColor: cardBg }]}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: mutedColor }]}>INVITE TOKEN</Text>
                                <TextInput
                                    style={[styles.input, { color: textColor, borderColor, backgroundColor: inputBg, textAlign: 'center', letterSpacing: 4, fontSize: 20 }]}
                                    placeholder="e.g. 8A2F9C"
                                    placeholderTextColor={mutedColor}
                                    value={token}
                                    onChangeText={setToken}
                                    autoCapitalize="characters"
                                    maxLength={10}
                                />
                            </View>
                            <Button
                                title="Verify Token"
                                onPress={checkToken}
                                icon={ArrowRight}
                                style={{ marginTop: 16 }}
                            />
                        </View>
                    </>
                ) : (
                    <>
                        <Text style={[styles.title, { color: textColor }]}>Sign Up & Join</Text>
                        <Text style={[styles.subtitle, { color: primaryColor, fontWeight: '700' }]}>
                            {verifiedCompany.name}
                        </Text>
                        <Text style={[styles.subtitle, { color: mutedColor, fontSize: 14, marginBottom: 24 }]}>
                            Create your account to complete the request.
                        </Text>

                        <View style={[styles.form, { backgroundColor: cardBg }]}>
                            {/* Form Fields */}
                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={[styles.label, { color: mutedColor }]}>First Name</Text>
                                    <TextInput
                                        style={[styles.input, { color: textColor, borderColor, backgroundColor: inputBg }]}
                                        value={firstName}
                                        onChangeText={setFirstName}
                                        placeholder="John"
                                        placeholderTextColor={mutedColor}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={[styles.label, { color: mutedColor }]}>Last Name</Text>
                                    <TextInput
                                        style={[styles.input, { color: textColor, borderColor, backgroundColor: inputBg }]}
                                        value={lastName}
                                        onChangeText={setLastName}
                                        placeholder="Doe"
                                        placeholderTextColor={mutedColor}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: mutedColor }]}>Email</Text>
                                <TextInput
                                    style={[styles.input, { color: textColor, borderColor, backgroundColor: inputBg }]}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    placeholder="john@example.com"
                                    placeholderTextColor={mutedColor}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: mutedColor }]}>Password</Text>
                                <TextInput
                                    style={[styles.input, { color: textColor, borderColor, backgroundColor: inputBg }]}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    placeholder="••••••"
                                    placeholderTextColor={mutedColor}
                                />
                            </View>

                            <Button
                                title="Create Account"
                                onPress={handleJoin}
                                icon={UserPlus}
                                style={{ marginTop: 16 }}
                            />

                            <TouchableOpacity onPress={() => setVerifiedCompany(null)} style={{ marginTop: 16 }}>
                                <Text style={{ color: mutedColor, textAlign: 'center', fontSize: 12 }}>Change Token</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 24 }}>
                    <Text style={{ color: mutedColor, textAlign: 'center' }}>Cancel</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 24, justifyContent: 'center', minHeight: '100%' },
    iconContainer: { alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
    subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
    form: { padding: 24, borderRadius: 16 },
    label: { fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },
    input: { fontSize: 16, height: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 16 },
    inputGroup: { marginBottom: 16 },
    row: { flexDirection: 'row', gap: 12 },
});
