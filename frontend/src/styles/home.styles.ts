import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    map: {
        flex: 1,
    },

    locationButton: {
        position: 'absolute',
        right: 20,
        bottom: 30,

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
});