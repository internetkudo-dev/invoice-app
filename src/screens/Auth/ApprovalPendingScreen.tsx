import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../api/supabase';
import { Button } from '../../components/common';
import { Clock, RefreshCw } from 'lucide-react-native';

export function ApprovalPendingScreen() {
    const { isDark, primaryColor } = useTheme();
    const { user, signOut } = useAuth();
    const [checking, setChecking] = useState(false);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    const checkStatus = async () => {
        if (!user) return;
        setChecking(true);
        try {
            // Check if status in employees is still pending
            const { data } = await supabase
                .from('employees')
                .select('status')
                .eq('user_id', user.id)
                .single();

            if (data?.status === 'active') {
                // How to trigger re-render in navigator?
                // Usually changing user metadata or context reload.
                // Or simply reload app / updates state in AuthContext.
                // For now, we'll assume AppNavigator might re-check if triggered.
                // But AppNavigator uses `useAuth` which only tracks session.

                // We need a mechanism to tell AppNavigator "Status Updated".
                // Maybe updates context? But useAuth might not expose status update.
                // Workaround: Alert user to restart app or we force reload?
                // Or maybe the Parent Component handles this.
            } else {
                // Remain here
            }
        } catch (e) { console.error(e); }
        finally { setChecking(false); }
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.iconContainer}>
                <Clock size={64} color={primaryColor} />
            </View>
            <Text style={[styles.title, { color: textColor }]}>Approval Pending</Text>
            <Text style={[styles.text, { color: mutedColor }]}>
                Your request to join the company is pending approval from an administrator.
                You cannot access the application until your request is approved.
            </Text>

            <Button
                title={checking ? "Checking..." : "Check Status"}
                onPress={checkStatus}
                icon={RefreshCw}
                style={{ marginTop: 24, width: '80%' }}
                variant="outline"
            />

            <TouchableOpacity onPress={() => signOut()} style={{ marginTop: 24 }}>
                <Text style={{ color: mutedColor }}>Sign Out</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    iconContainer: { marginBottom: 24, padding: 20, backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 50 },
    title: { fontSize: 24, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
    text: { fontSize: 16, textAlign: 'center', lineHeight: 24 }
});
