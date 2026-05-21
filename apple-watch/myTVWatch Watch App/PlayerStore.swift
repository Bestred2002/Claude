import Foundation
import AVFoundation
import WatchKit
import Combine

@MainActor
final class PlayerStore: ObservableObject {
    static let shared = PlayerStore()

    @Published var currentName: String? = nil
    @Published var isPlaying: Bool = false
    @Published var tvChannels: [Station] = []
    @Published var isRefreshing: Bool = false

    private var player: AVPlayer?
    private let tvCacheKey = "mytv.tvChannels.v2"

    init() {
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.allowAirPlay, .allowBluetoothA2DP])
        try? AVAudioSession.sharedInstance().setActive(true)
        loadTVCache()
        Task { await refreshTVFromInternet() }
    }

    // MARK: - Lista TV
    func refreshTVFromInternet() async {
        isRefreshing = true
        let list = await Catalog.fetchTVChannels()
        if !list.isEmpty {
            tvChannels = list
            persistTVCache(list)
        }
        isRefreshing = false
    }

    private func persistTVCache(_ list: [Station]) {
        if let data = try? JSONEncoder().encode(list) {
            UserDefaults.standard.set(data, forKey: tvCacheKey)
        }
    }

    private func loadTVCache() {
        if let data = UserDefaults.standard.data(forKey: tvCacheKey),
           let list = try? JSONDecoder().decode([Station].self, from: data) {
            tvChannels = list
        }
    }

    // MARK: - Playback
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
}
