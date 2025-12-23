import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var sidebarSelection: SidebarSelection?
    @State private var selectedStamp: Stamp?
    @State private var filterState = StampFilterState()
    @State private var columnVisibility: NavigationSplitViewVisibility = .all
    @State private var showingGapAnalysis = false
    @State private var showingCountryManagement = false

    @Query private var countries: [Country]

    var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            SidebarView(selection: $sidebarSelection)
                .navigationSplitViewColumnWidth(min: 200, ideal: 240, max: 300)
        } content: {
            StampListView(
                filterState: filterState,
                sidebarSelection: sidebarSelection,
                selectedStamp: $selectedStamp
            )
        } detail: {
            detailView
                .navigationSplitViewColumnWidth(min: 300, ideal: 350, max: 450)
        }
        .searchable(text: $filterState.searchText, prompt: "Search stamps...")
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                Button {
                    showingCountryManagement = true
                } label: {
                    Label("Countries", systemImage: "globe")
                }
                .help("Manage countries and catalog prefixes")

                Button {
                    showingGapAnalysis = true
                } label: {
                    Label("Gap Analysis", systemImage: "chart.bar.doc.horizontal")
                }
                .help("Analyze collection gaps by country and year range")
            }
        }
        .sheet(isPresented: $showingGapAnalysis) {
            GapAnalysisView()
        }
        .sheet(isPresented: $showingCountryManagement) {
            CountryManagementView()
        }
        .onAppear {
            initializeDataIfNeeded()
        }
    }

    @ViewBuilder
    private var detailView: some View {
        if let stamp = selectedStamp {
            StampDetailView(stamp: stamp)
        } else {
            ContentUnavailableView(
                "No Selection",
                systemImage: "stamp",
                description: Text("Select a stamp to view its details.")
            )
        }
    }

    private func initializeDataIfNeeded() {
        if countries.isEmpty {
            Country.createDefaultCountries(in: modelContext)
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: [Collection.self, Album.self, Stamp.self, Country.self], inMemory: true)
}
