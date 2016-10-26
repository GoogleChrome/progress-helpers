importScripts('../build/background-sync-queue.js')

//initialize bdQ
goog.backgroundSyncQueue.initialize()

self.addEventListener('fetch',function(e){
	if(e.request.url.startsWith("http://localhost:8080/api"))
	{
		const clone = e.request.clone();
		goog.backgroundSyncQueue.pushIntoQueue(clone);
	}
});


// Have the service worker take control as soon as possible.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());