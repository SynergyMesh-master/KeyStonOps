"""
INSTANT API - 即時 API 接口
提供毫秒級響應的即時架構服務
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import time
from typing import Dict, Any
from engine import InstantEngine

app = FastAPI(title="INSTANT Architecture API", version="1.0.0")

# 初始化即時引擎
instant_engine = InstantEngine()

class InstantRequest(BaseModel):
    """即時請求模型"""
    project_type: str = "mcp_level1"
    requirements: Dict[str, Any] = {}
    constraints: Dict[str, Any] = {}
    optimization_level: str = "maximum"

@app.post("/instant/architect")
async def instant_architect(request: InstantRequest):
    """即時架構接口"""
    start_time = time.time()
    
    try:
        # 執行即時管道
        result = await instant_engine.execute_instant_pipeline(request.dict())
        
        # 檢查是否滿足即時要求
        response_time = (time.time() - start_time) * 1000
        
        return JSONResponse(
            content={
                "success": True,
                "response_time_ms": response_time,
                "instant_compliant": result["instant_compliant"],
                "result": result
            },
            headers={"X-Response-Time": f"{response_time:.2f}ms"}
        )
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "instant_mode": False
            }
        )

@app.get("/instant/health")
async def instant_health():
    """即時健康檢查"""
    return {
        "status": "instant",
        "engine_ready": True,
        "performance_metrics": instant_engine.get_performance_metrics()
    }

@app.get("/instant/metrics")
async def instant_metrics():
    """即時性能指標"""
    return instant_engine.get_performance_metrics()

@app.post("/instant/validate")
async def instant_validate(architecture: Dict[str, Any]):
    """即時驗證接口"""
    validator = instant_engine.validator
    result = validator.validate(architecture)
    return result

@app.post("/instant/deploy")
async def instant_deploy(architecture: Dict[str, Any]):
    """即時部署接口"""
    deployer = instant_engine.deployer
    result = deployer.deploy(architecture)
    return result

# 啟動配置
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, workers=4)