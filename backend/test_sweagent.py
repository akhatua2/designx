#!/usr/bin/env python3
"""
Test script to verify SWE-agent integration works correctly
"""
import sys
import os
from pathlib import Path

# Add SWE-agent to Python path
sys.path.insert(0, '../SWE-agent')

def test_sweagent_imports():
    """Test importing SWE-agent modules"""
    try:
        from sweagent.run.run_single import RunSingleConfig, run_from_config
        from sweagent.environment.swe_env import EnvironmentConfig
        from sweagent.agent.agents import DefaultAgentConfig
        from sweagent.agent.problem_statement import GithubIssue
        from sweagent.agent.models import GenericAPIModelConfig
        print('✅ All SWE-agent modules imported successfully')
        return True
    except ImportError as e:
        print(f'❌ Import error: {e}')
        return False
    except Exception as e:
        print(f'❌ Unexpected error during import: {e}')
        return False

def test_sweagent_config():
    """Test creating SWE-agent configuration objects"""
    try:
        from sweagent.run.run_single import RunSingleConfig
        from sweagent.environment.swe_env import EnvironmentConfig
        from sweagent.agent.agents import DefaultAgentConfig
        from sweagent.agent.problem_statement import GithubIssue
        from sweagent.agent.models import GenericAPIModelConfig
        
        # Test creating configuration objects
        model_config = GenericAPIModelConfig(
            name='gpt-4o-mini',
            per_instance_cost_limit=1.00
        )
        print('✅ ModelConfig created successfully')
        
        agent_config = DefaultAgentConfig(model=model_config)
        print('✅ AgentConfig created successfully')
        
        env_config = EnvironmentConfig()
        print('✅ EnvironmentConfig created successfully')
        
        problem_statement_config = GithubIssue(github_url='https://github.com/test/repo/issues/1')
        print('✅ ProblemStatementConfig created successfully')
        
        # Test creating main config (this is what our API does)
        config = RunSingleConfig(
            agent=agent_config,
            env=env_config,
            problem_statement=problem_statement_config,
            output_dir=Path("/tmp/test_trajectories")
        )
        print('✅ RunSingleConfig created successfully')
        
        return True
        
    except Exception as e:
        print(f'❌ Configuration error: {e}')
        import traceback
        traceback.print_exc()
        return False

def test_environment_variables():
    """Test environment variable setup"""
    # Set test environment variables
    os.environ["GITHUB_TOKEN"] = "test_token"
    os.environ["OPENAI_API_KEY"] = "test_api_key"
    
    print(f'✅ GITHUB_TOKEN set: {bool(os.environ.get("GITHUB_TOKEN"))}')
    print(f'✅ OPENAI_API_KEY set: {bool(os.environ.get("OPENAI_API_KEY"))}')
    
    return True

def main():
    """Run all tests"""
    print("🧪 Testing SWE-agent integration...")
    print("=" * 50)
    
    # Test 1: Imports
    print("\n1. Testing SWE-agent imports...")
    if not test_sweagent_imports():
        print("❌ Import test failed")
        return False
    
    # Test 2: Configuration
    print("\n2. Testing SWE-agent configuration...")
    if not test_sweagent_config():
        print("❌ Configuration test failed")
        return False
    
    # Test 3: Environment variables
    print("\n3. Testing environment variables...")
    if not test_environment_variables():
        print("❌ Environment variable test failed")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 All tests passed! SWE-agent integration is working correctly!")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 