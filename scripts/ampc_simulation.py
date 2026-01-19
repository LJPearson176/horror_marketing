
import random
import math
import time

# --- 1. Linear Algebra Helper (Pure Python) ---
class Vector:
    def __init__(self, data):
        self.data = data # list of floats

    def __repr__(self):
        return f"[{', '.join([f'{x:.2f}' for x in self.data])}]"

    def __add__(self, other):
        return Vector([a + b for a, b in zip(self.data, other.data)])

    def __sub__(self, other):
        return Vector([a - b for a, b in zip(self.data, other.data)])

    def __mul__(self, scalar):
        return Vector([a * scalar for a in self.data])
    
    def dot(self, other):
        return sum(a * b for a, b in zip(self.data, other.data))

    def hadamard(self, other): # Element-wise multiply
        return Vector([a * b for a, b in zip(self.data, other.data)])

    def magnitude(self):
        return math.sqrt(sum(x**2 for x in self.data))

class Matrix:
    def __init__(self, rows):
        self.rows = rows # list of lists

    def __mul__(self, vector): # Matrix-Vector multiplication
        result = []
        for row in self.rows:
            val = sum(r * v for r, v in zip(row, vector.data))
            result.append(val)
        return Vector(result)

# --- 2. The Human Plant Model ---
class HumanPlant:
    def __init__(self):
        # State: [Arousal, Valence, Habituation]
        # Range: [0..1, -1..1, 0..1]
        self.state = Vector([0.2, 0.0, 0.0]) # Initial: Calm, Neutral, Fresh
        
        # A: Inertia Matrix (How much state persists)
        self.A = Matrix([
            [0.90, 0.00, 0.00], # Arousal is sticky
            [0.10, 0.85, 0.00], # Valence fluctuates faster
            [0.05, 0.00, 0.99]  # Habituation builds slowly and sticks
        ])

        # K: Control Efficacy Matrix (How inputs affect state)
        # Inputs: [Luminance, Sonics, Geometry]
        # Mapping to: [Arousal, Valence, Habituation]
        self.K = Matrix([
            [0.4, 0.5, 0.2],  # Inputs drive Arousal strongly
            [-0.2, -0.4, -0.1], # Inputs tend to lower Valence (Scary)
            [0.01, 0.01, 0.01]  # Inputs slowly build Habituation
        ])

        # Decay/Homeostasis
        self.baseline = Vector([0.1, 0.0, 0.0]) 
        self.decay_rate = 0.05

    def step(self, u_t):
        """
        x_{t+1} = A x_t + K * (u_t * (1 - habituation)) - Decay
        """
        # 1. Inertia
        inertia_term = self.A * self.state

        # 2. Input Efficacy (Dampened by Habituation)
        hab_factor = 1.0 - self.state.data[2] # (1 - x_hab)
        eff_input = u_t * hab_factor 
        input_term = self.K * eff_input

        # 3. Decay to Baseline
        # D * (x - baseline)
        decay_term = (self.state - self.baseline) * self.decay_rate

        # Update
        new_state = inertia_term + input_term - decay_term

        # Clamp Constraints
        arousal = max(0.0, min(1.0, new_state.data[0]))
        valence = max(-1.0, min(1.0, new_state.data[1]))
        habituation = max(0.0, min(1.0, new_state.data[2]))

        self.state = Vector([arousal, valence, habituation])
        return self.state

# --- 3. The MPC Controller ---
class AffectiveMPC:
    def __init__(self):
        self.target_arousal = 0.6 # The "Flow Channel"
        self.horizon = 3 # Lookahead steps
    
    def optimize(self, current_plant_state):
        # Naive Random Shooting Optimization (since we lack scipy)
        # Find u that minimizes cost over horizon
        
        best_u = Vector([0, 0, 0])
        min_cost = float('inf')

        # Sample 50 random action vectors
        for _ in range(50):
            # Generate random input [Lum, Son, Geo] in range [0..1]
            u_cand = Vector([random.random(), random.random(), random.random()])
            
            # Predict outcome (One step lookahead for simplicity in this prototype)
            # In real MPC we'd simulate the plant forward over H steps
            # Here we just peek at next state cost
            
            # Mock plant step
            p_state = current_plant_state # Immutable-ish copy needed logic? No, just using current values
            
            # Simplified prediction model (replicating Plant logic)
            # Just calculating expected arousal
            hab_factor = 1.0 - p_state.data[2]
            
            # Estimate Force on Arousal: Sum(Inputs * Weights) * Hab
            # Weights from K row 0: [0.4, 0.5, 0.2]
            force = (u_cand.data[0]*0.4 + u_cand.data[1]*0.5 + u_cand.data[2]*0.2) * hab_factor
            
            predicted_arousal = p_state.data[0]*0.9 + force - (p_state.data[0]-0.1)*0.05
            
            # Cost Function
            # J = (x - x_ref)^2 + lambda * u^2
            tracking_error = (predicted_arousal - self.target_arousal) ** 2
            control_effort = u_cand.magnitude() * 0.1 # Penalty for high energy
            
            cost = tracking_error + control_effort
            
            if cost < min_cost:
                min_cost = cost
                best_u = u_cand
                
        return best_u

# --- 4. Simulation Loop ---
def run_simulation():
    plant = HumanPlant()
    controller = AffectiveMPC()
    
    print(f"{'TIME':<5} | {'AROUSAL':<10} | {'VALENCE':<10} | {'HABIT':<10} | {'INPUT (L/S/G)':<20} | {'VISUALIZATION'}")
    print("-" * 80)

    history = []

    for t in range(60): # 60 seconds
        # 1. Controller decides input
        u_t = controller.optimize(plant.state)
        
        # 2. Plant evolves
        state = plant.step(u_t)
        
        # 3. Log
        arousal = state.data[0]
        valence = state.data[1]
        habituation = state.data[2]
        
        # ASCII Viz
        bars = "|" * int(arousal * 20)
        
        print(f"{t:<5} | {arousal:<10.2f} | {valence:<10.2f} | {habituation:<10.2f} | {str(u_t):<20} | {bars}")
        history.append(state)
        
        # Scenario: Inject a shock at t=30
        if t == 30:
            print(">>> EVENT: JUMP SCARE (Forced State Spike) <<<")
            plant.state.data[0] = 0.95 # Max arousal
            plant.A.rows[2][2] = 0.6 # Temp habituation reset (Disinhibition)

    return history

if __name__ == "__main__":
    run_simulation()
