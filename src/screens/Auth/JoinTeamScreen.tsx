import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button, Card, LoadingOverlay } from '../../components/common';
import { supabase } from '../../api/supabase';
import { ShieldCheck, ArrowRight } from 'lucide-react-native';

export function JoinTeamScreen({ navigation }: any) {
    const { isDark, primaryColor } = useTheme();
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        if (!token.trim()) {
            Alert.alert('Error', 'Please enter a valid token');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('join_company', { token: token.trim() });

            if (error) throw error;

            if (data.success) {
                Alert.alert(
                    'Request Sent',
                    'Your request to join the team has been sent. Please wait for an admin to approve your account.',
                    [{ text: 'OK', onPress: () => navigation.navigate('Dashboard') }]
                );
            } else {
                Alert.alert('Join Failed', data.error || 'Invalid token');
            }
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

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <LoadingOverlay visible={loading} text="Joining Team..." />

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <ShieldCheck size={64} color={primaryColor} />
                </View>

                <Text style={[styles.title, { color: textColor }]}>Join Your Team</Text>
                <Text style={[styles.subtitle, { color: mutedColor }]}>
                    Enter the unique invitation token provided by your company administrator.
                </Text>

                <Card style={[styles.card, { backgroundColor: cardBg }]}>
                    <Text style={[styles.label, { color: mutedColor }]}>INVITE TOKEN</Text>
                    <TextInput
                        style={[styles.input, { color: textColor, borderColor: isDark ? '#334155' : '#e2e8f0' }]}
                        placeholder="e.g. 8A2F9C"
                        placeholderTextColor={mutedColor}
                        value={token}
                        onChangeText={setToken}
                        autoCapitalize="characters"
                        maxLength={10}
                    />
                </Card>

                <Button
                    title="Send Join Request"
                    onPress={handleJoin}
                    icon={ArrowRight}
                    style={{ marginTop: 24 }}
                />

                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
                    <Text style={{ color: mutedColor, textAlign: 'center' }}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center' },
    content: { padding: 32 },
    iconContainer: { alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
    subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
    card: { padding: 20, borderRadius: 16 },
    label: { fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 1 },
    input: { fontSize: 24, fontWeight: '700', height: 60, borderBottomWidth: 2, textAlign: 'center', letterSpacing: 4 },
});
