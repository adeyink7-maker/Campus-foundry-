import { AppRegistry } from 'react-native';
import BackgroundFetch from 'react-native-background-fetch';
import App from '../App';
import appConfig from '../../app.json';
import { HeadlessBackgroundCleanupTask } from './backgroundCleanupTask';

const appName = appConfig.name;

// Register the Headless Task for when app is killed/closed
if (BackgroundFetch && typeof BackgroundFetch.registerHeadlessTask === 'function') {
  BackgroundFetch.registerHeadlessTask(HeadlessBackgroundCleanupTask);
}

if (AppRegistry && typeof AppRegistry.registerComponent === 'function') {
  AppRegistry.registerComponent(appName, () => App);
}

export default App;
