import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    map: {
        flex: 1,
    },

    mapSelectorContainer: {
        position: 'absolute',
        left: '50%',
        marginLeft: -60,
        width: 120,
        zIndex: 20,
    },

    mapSelector: {
        width: 120,
        height: 36,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },

    mapSelectorLabel: {
        fontFamily: 'Pretendard-Bold',
        fontSize: 14,
        lineHeight: 20,
        color: '#000000',
        includeFontPadding: false,
    },

    mapSelectorShade: {
        ...StyleSheet.absoluteFill,
        borderRadius: 14,
        backgroundColor: '#000000',
    },

    mapSelectorFontFallback: {
        fontFamily: undefined,
        fontWeight: '700',
    },

    mapSelectorChevron: {
        width: 20,
        height: 20,
    },

    mapMenuBackdrop: {
        ...StyleSheet.absoluteFill,
        zIndex: 10,
    },

    mapMenu: {
        marginTop: 8,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        boxShadow: [{
            offsetX: 0,
            offsetY: 6,
            blurRadius: 20,
            color: 'rgba(0, 0, 0, 0.12)',
        }],
    },

    mapMenuItem: {
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },

    mapMenuItemSelected: {
        backgroundColor: '#F5F1EC',
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
