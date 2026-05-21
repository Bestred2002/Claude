import Foundation
import WatchConnectivity

// Riceve dall'app iPhone la lista canali TV con stream aggiornati e
// la propaga al PlayerStore. L'app iPhone deve inviare un dictionary
// con chiave "tv" contenente un array di [name, streamURL, logoURL].
final class WatchSession: NSObject, WCSessionDelegate {
    static let shared = WatchSession()

    func start() {
        guard WCSession.isSupported() else { return }
        let s = WCSession.default
        s.delegate = self
        s.activate()
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        applyContext(applicationContext)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        applyContext(message)
    }

    private func applyContext(_ ctx: [String: Any]) {
        guard let tv = ctx["tv"] as? [[String: Any]] else { return }
        let list: [Station] = tv.compactMap { dict in
            guard let name = dict["name"] as? String else { return nil }
            return Station(
                name: name,
                streamURL: (dict["streamURL"] as? String) ?? "",
                logoURL: dict["logoURL"] as? String
            )
        }
        DispatchQueue.main.async {
            PlayerStore.shared.updateTVChannels(list)
        }
    }
}
