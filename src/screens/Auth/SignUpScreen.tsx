import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

interface SignUpScreenProps {
    onNavigateToSignIn: () => void;
    navigation?: any;
}

export function SignUpScreen({ onNavigateToSignIn, navigation }: SignUpScreenProps) {
    const { signUp, verifyEmailOtp } = useAuth();
    const { isDark, primaryColor } = useTheme();
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [companyRegNumber, setCompanyRegNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Dynamic theme colors
    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const inputBg = isDark ? '#0f172a' : '#f1f5f9';
    const textColor = isDark ? '#fff' : '#1e293b';
    const labelColor = isDark ? '#e2e8f0' : '#374151';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const borderColor = isDark ? '#334155' : '#e2e8f0';

    const handleSignUp = async () => {
        if (!email || !password || !confirmPassword || !firstName || !lastName || !phone) {
            setError('Please fill in all required fields marked with *');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { error: signUpError } = await signUp(email, password, {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    full_name: `${firstName} ${lastName}`,
                    phone: phone,
                    company_name: companyName,
                    tax_id: companyRegNumber
                }
            });
            if (signUpError) {
                setError(signUpError.message);
            } else {
                setSuccess(true);
            }
        } catch (e) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const [verificationCode, setVerificationCode] = useState('');

    const handleVerify = async () => {
        if (!verificationCode) {
            setError('Please enter the code');
            return;
        }
        setLoading(true);
        try {
            const { error } = await verifyEmailOtp(email, verificationCode);
            if (error) {
                setError(error.message);
            } else {
                onNavigateToSignIn();
            }
        } catch (e) {
            setError('Verification failed');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: bgColor }]}>
                <View style={styles.successBox}>
                    <Text style={styles.successTitle}>Verify Email</Text>
                    <Text style={[styles.successText, { color: mutedColor }]}>
                        Please enter the verification code sent to {email}
                    </Text>

                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <TextInput
                        style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor, width: '100%', textAlign: 'center', fontSize: 24, letterSpacing: 4 }]}
                        placeholder="000000"
                        placeholderTextColor={mutedColor}
                        value={verificationCode}
                        onChangeText={setVerificationCode}
                        keyboardType="number-pad"
                        maxLength={6}
                    />

                    <TouchableOpacity style={[styles.button, { backgroundColor: primaryColor, marginTop: 24, width: '100%' }]} onPress={handleVerify} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify Code</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity style={{ marginTop: 16 }} onPress={onNavigateToSignIn}>
                        <Text style={[styles.link, { color: primaryColor }]}>Skip to Sign In</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: bgColor }]}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <Text style={[styles.title, { color: primaryColor }]}>Create Account</Text>
                    <Text style={[styles.subtitle, { color: mutedColor }]}>Start managing your invoices</Text>
                </View>

                <View style={[styles.form, { backgroundColor: cardBg }]}>
                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: labelColor }]}>Name *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                            placeholder="First Name"
                            placeholderTextColor={mutedColor}
                            value={firstName}
                            onChangeText={setFirstName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: labelColor }]}>Last Name *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                            placeholder="Last Name"
                            placeholderTextColor={mutedColor}
                            value={lastName}
                            onChangeText={setLastName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: labelColor }]}>Email *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                            placeholder="Enter your email"
                            placeholderTextColor={mutedColor}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: labelColor }]}>Password *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                            placeholder="Create a password"
                            placeholderTextColor={mutedColor}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: labelColor }]}>Confirm Password *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                            placeholder="Confirm your password"
                            placeholderTextColor={mutedColor}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: labelColor }]}>Phone Number *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                            placeholder="+1 234 567 8900"
                            placeholderTextColor={mutedColor}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: labelColor }]}>Company Name</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                            placeholder="Your Company Details"
                            placeholderTextColor={mutedColor}
                            value={companyName}
                            onChangeText={setCompanyName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: labelColor }]}>Company Registered Number</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                            placeholder="Tax ID / Registration"
                            placeholderTextColor={mutedColor}
                            value={companyRegNumber}
                            onChangeText={setCompanyRegNumber}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: primaryColor }, loading && styles.buttonDisabled]}
                        onPress={handleSignUp}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Create Account</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: mutedColor }]}>Already have an account?</Text>
                        <TouchableOpacity onPress={onNavigateToSignIn}>
                            <Text style={[styles.link, { color: primaryColor }]}>Sign In</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.footer, { marginTop: 12 }]}>
                        <Text style={[styles.footerText, { color: mutedColor }]}>Joining a company?</Text>
                        <TouchableOpacity onPress={() => (navigation as any).navigate('JoinTeam')}>
                            <Text style={[styles.link, { color: primaryColor }]}>Enter Invite Code</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
    },
    form: {
        borderRadius: 16,
        padding: 24,
    },
    errorBox: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: '#ef4444',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    errorText: {
        color: '#ef4444',
        textAlign: 'center',
    },
    successBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#10b981',
        marginBottom: 12,
    },
    successText: {
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
    },
    button: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
        gap: 4,
    },
    footerText: {
    },
    link: {
        fontWeight: '600',
    },
});
