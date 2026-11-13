import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    map: {
        flex: 1,
    },

    notesStatus: {
        position: 'absolute',
        left: 24,
        right: 24,
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        zIndex: 5,
    },

    notesStatusText: {
        color: '#3B2A20',
        fontSize: 14,
        textAlign: 'center',
    },

    mapSelectorContainer: {
        position: 'absolute',
        flexDirection: 'row',
        gap: 6,
        zIndex: 20,
    },

    mapFilterButton: {
        flex: 1,
        minWidth: 0,
        minHeight: 44,
        paddingVertical: 6,
        justifyContent: 'center',
    },

    mapFilterChip: {
        borderRadius: 999,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 4, color: 'rgba(0, 0, 0, 0.12)' }],
    },

    mapFilterChipSelected: {
        backgroundColor: '#0E0E0E',
    },

    mapSelectorLabel: {
        fontFamily: 'NotoSansKR-Bold',
        fontSize: 13,
        lineHeight: 16,
        letterSpacing: -0.3,
        color: '#0E0E0E',
        includeFontPadding: false,
    },

    mapFilterLabelSelected: {
        color: '#FFFFFF',
    },

    mapSelectorShade: {
        ...StyleSheet.absoluteFill,
        borderRadius: 999,
        backgroundColor: '#000000',
    },

    mapSelectorFontFallback: {
        fontFamily: undefined,
        fontWeight: '700',
    },

    locationButton: {
        position: 'absolute',
        right: 28,
        bottom: 110,

        width: 48,
        height: 48,
        borderRadius: 24,

        backgroundColor: '#fff',

        alignItems: 'center',
        justifyContent: 'center',

        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 5,
        shadowOffset: {
            width: 0,
            height: 2,
        },

        elevation: 4,
    },
    
    locationButtonActive: {
        backgroundColor: '#e8f2ff',
    },

    locationIcon: {
        fontSize: 26,
    },

    composeButton: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: [{
            offsetX: 0,
            offsetY: 6,
            blurRadius: 20,
            spreadDistance: 0,
            color: 'rgba(0, 0, 0, 0.12)',
        }],
    },

    composeButtonPressed: {
        opacity: 0.9,
    },

    composeIcon: {
        width: 14,
        height: 14,
    },
});
