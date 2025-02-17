<div align="center">
<img src="https://cdn.prod.website-files.com/6740d85c4e3daeef29a89470/67b387ef3a852cbd4180da68__cn9kq.gif" alt="Truman Town Project Logo"/>

# 🌐 Truman Town: An AI-Driven Village Simulation
<p>Powered by Advanced AI Systems for Dynamic NPC Interactions</p>

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Rust](https://img.shields.io/badge/rust-1.70%2B-orange.svg)](https://www.rust-lang.org/)
[![Bevy](https://img.shields.io/badge/Bevy-0.12-yellow)](https://bevyengine.org/)
</div>

## 🚀 What is Truman Town?
Truman Town is a sophisticated AI village simulation that creates a living, breathing world of NPCs with varying levels of self-awareness. Directly inspired by "The Truman Show," the simulation features a central unaware protagonist surrounded by AI-driven aware citizens, creating unique and complex social dynamics that explore the boundaries between reality and simulation.

### Key Features
- 🧠 **Advanced AI Systems**: Complex personality and behavior patterns with special focus on maintaining the simulation's integrity
- 🤝 **Dynamic Social Interactions**: Realistic relationship dynamics between aware and unaware residents
- 💭 **Memory Systems**: Short and long-term memory with natural decay and scenario consistency
- 🎭 **Protagonist System**: Specialized AI for the unaware central character
- 🎬 **Director Mode**: Control and influence town events to create engaging scenarios

## 🛠️ Quick Start

### Prerequisites
- Rust 1.70+
- Cargo package manager
- PostgreSQL database

### Installation
```bash
# Install using cargo
cargo install trumantown

# Or build from source
git clone https://github.com/sovagpt/trumantown.git
cd trumantown
cargo build --release
```

### Basic Usage
```rust
use trumantown::Town;

fn main() {
    let mut town = Town::new();
    
    // Initialize the protagonist
    town.create_protagonist();
    
    // Add aware NPCs as town residents
    town.add_aware_resident(ResidentType::Neighbor);
    town.add_aware_resident(ResidentType::Shopkeeper);
    
    town.run();
}
```

## 🧠 AI Systems
- **Protagonist AI**: Special system for the unaware central character
- **Resident AI**: Advanced system for aware NPCs
- **Director System**: Scenario creation and management
- **Memory System**: Consistent experience storage and recall
- **Social System**: Complex relationship dynamics
- **Script System**: Contextual dialogue and scenario management

## ⚙️ Configuration
```rust
let config = Config {
    simulation: SimulationConfig {
        tick_rate: 60.0,
        world_size: Vec2::new(1000.0, 1000.0),
        max_entities: 1000,
    },
    ai: AiConfig {
        protagonist_awareness: 0.0,
        resident_awareness: 1.0,
        memory_decay_rate: 0.1,
        interaction_radius: 50.0,
        scenario_complexity: 0.8,
    },
};
```

## 🎮 Controls
- Left Click: Select Resident/Interact
- Right Click: Director Mode Options
- Space: Pause/Resume Simulation
- Tab: Switch Between Protagonist and Director Views

## 📊 Features

### Protagonist Experience
- Naturalistic daily routines
- Meaningful relationships
- Career progression
- Personal growth events
- "Unscripted" adventures

### Resident Behaviors
- Role maintenance
- Scenario participation
- Emergency handling
- Relationship building
- Background activities

### Town Events
- Scheduled scenarios
- Spontaneous events
- Community activities
- Career opportunities
- Social gatherings

## 🤝 Contributing
Contributions are welcome! Please check our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 📝 License
This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 📫 Contact
For questions, issues, or contributions, please visit our [GitHub repository](https://github.com/sovagpt/trumantown).
