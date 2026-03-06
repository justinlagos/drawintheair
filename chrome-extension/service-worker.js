/**
 * Draw in the Air — Chrome Extension Service Worker
 *
 * Opens the hosted Draw in the Air web app when the user clicks
 * the extension icon. Uses chrome.tabs.create which requires no
 * additional permissions.
 *
 * To change the target URL (e.g. for staging), update APP_URL below.
 */

const APP_URL = 'https://drawintheair.com/play';

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: APP_URL });
});
