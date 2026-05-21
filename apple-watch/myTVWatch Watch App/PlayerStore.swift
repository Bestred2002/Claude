import Foundation
import AVFoundation
import WatchKit
import Combine

final class PlayerStore: ObservableObject {
    static let shared = PlayerStore()

    @Published var currentName: String? = nil
    @Published var isPlaying: Bool = false
    @Published var tvChannels: [Station] = Catalog.defaultTV

    private var player: AVPlayer?

    init() {
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.allowAirPlay, .allowBluetoothA2DP])
        try? AVAudioSession.sharedInstance().setActive(true)
        loadTVCache()
    }

    func play(_ s: Station) {
        guard s.hasStream, let url = URL(string: s.streamURL) else { return }
        let item = AVPlayerItem(url: url)
        player = AVPlayer(playerItem: item)
        player?.play()
        currentName = s.name
        isPlaying = true
    }

    func toggle() {
        guard let p = player else { return }
        if isPlaying { p.pause() } else { p.play() }
        isPlaying.toggle()
    }

    func stop() {
        player?.pause()
        player = nil
        isPlaying = false
        currentName = nil
    }

    // I canali TV provengono dalla lista caricata sull'iPhone tramite
    // WatchConnectivity (vedi WatchSession).
    func updateTVChannels(_ list: [Station]) {
        tvChannels = list
        if let data = try? JSONEncoder().encode(list) {
            UserDefaults.standard.set(data, forKey: "mytv.tvChannels")
        }
    }

    private func loadTVCache() {
        if let data = UserDefaults.standard.data(forKey: "mytv.tvChannels"),
           let list = try? JSONDecoder().decode([Station].self, from: data) {
            tvChannels = list
        }
    }
}
