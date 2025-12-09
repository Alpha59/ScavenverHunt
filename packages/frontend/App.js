"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const expo_status_bar_1 = require("expo-status-bar");
const react_native_1 = require("react-native");
function App() {
    return (<react_native_1.View style={styles.container}>
      <react_native_1.Text>Scavenger Hunt frontend is running.</react_native_1.Text>
      <expo_status_bar_1.StatusBar style="auto"/>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
