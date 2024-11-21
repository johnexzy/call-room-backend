import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KnowledgeBaseService } from './knowledge-base.service';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@ApiTags('knowledge-base')
@Controller({
  path: 'knowledge-base',
  version: '1',
})
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KnowledgeBaseController {
  constructor(private knowledgeBaseService: KnowledgeBaseService) {}

  @Get()
  @ApiOperation({ summary: 'Find knowledge base articles' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  async findArticles(
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.knowledgeBaseService.findArticles(search, category);
  }

  @Post(':id/helpful')
  @ApiOperation({ summary: 'Mark article as helpful' })
  async markHelpful(@Param('id') id: string) {
    return this.knowledgeBaseService.markHelpful(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new article' })
  async createArticle(@Body() articleData: CreateArticleDto) {
    return this.knowledgeBaseService.create(articleData);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update existing article' })
  async updateArticle(
    @Param('id') id: string,
    @Body() articleData: UpdateArticleDto,
  ) {
    return this.knowledgeBaseService.update(id, articleData);
  }
}
