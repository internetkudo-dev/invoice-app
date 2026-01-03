import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View, Text, Animated, Pressable } from 'react-native';
import { Plus, FileText, Users, Package, X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';

interface Action {
    icon: any;
    label: string;
    onPress: () => void;
    color: string;
}

interface FABProps {
    onPress: () => void;
    actions?: Action[];
    icon?: any;
    color?: string;
}

export function FAB({ onPress, actions, icon: CustomIcon, color }: FABProps) {
    const { primaryColor, isDark } = useTheme();
    // ...
    const [isOpen, setIsOpen] = useState(false);
    const [animation] = useState(new Animated.Value(0));

    const toggleMenu = () => {
        const toValue = isOpen ? 0 : 1;
        Animated.spring(animation, {
            toValue,
            useNativeDriver: true,
            friction: 5,
            tension: 40,
        }).start();
        setIsOpen(!isOpen);
    };

    const handleMainPress = () => {
        if (isOpen) {
            toggleMenu();
        } else {
            onPress();
        }
    };

    const handleActionPress = (actionOnPress: () => void) => {
        toggleMenu();
        actionOnPress();
    };

    const rotation = animation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '45deg'],
    });

    const backdropOpacity = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    return (
        <>
            {isOpen && (
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={toggleMenu}
                >
                    <Animated.View style={[styles.backdrop, { opacity: backdropOpacity, backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)' }]} />
                </Pressable>
            )}

            <View style={styles.container}>
                {actions?.map((action, index) => {
                    const translateY = animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -70 * (index + 1)],
                    });

                    const scale = animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                    });

                    return (
                        <Animated.View
                            key={index}
                            style={[
                                styles.actionContainer,
                                { transform: [{ translateY }, { scale }] },
                            ]}
                        >
                            <Text style={[styles.actionLabel, { color: '#fff', backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                                {action.label}
                            </Text>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: action.color }]}
                                onPress={() => handleActionPress(action.onPress)}
                            >
                                <action.icon color="#fff" size={20} />
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}

                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: color || primaryColor }]}
                    onPress={handleMainPress}
                    onLongPress={actions ? toggleMenu : undefined}
                    delayLongPress={300}
                >
                    <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                        {CustomIcon ? <CustomIcon color="#fff" size={28} /> : <Plus color="#fff" size={28} />}
                    </Animated.View>
                </TouchableOpacity>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        alignItems: 'center',
    },
    backdrop: {
        flex: 1,
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    actionContainer: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 8,
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    actionLabel: {
        position: 'absolute',
        right: 54,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        fontSize: 12,
        fontWeight: '600',
        overflow: 'hidden',
    },
});
